
const doc = document;

//delete window.indexedDB;


/**
 * Oбъект-константа с привязками к DOM - элементам
 *
 * @type {{textArea: Node, saveButton: Node, clearAreaButton: Node, clearListButton: Node, listNotes: HTMLElement, tagP: NodeListOf<Element>}}
 */
const docObj = {
  textArea: doc.getElementsByTagName('textarea')[0],
  saveButton: doc.getElementsByTagName('button')[0],
  clearAreaButton: doc.getElementsByTagName('button')[1],
  clearListButton: doc.getElementsByTagName('button')[2],
  listNotes: doc.getElementById('listNotes'),
  tagP: doc.getElementsByTagName('p')
};

/**
 * Константа для настройки хранилищ данных
 *
 * @type {{INDEXED_DB_NAME: string, INDEXED_DB_VERSION: number, INDEXED_STORAGE_NAME: string, LOCAL_STORAGE_NAME: string, COOKIE_NAME: string}}
 */
const SETTINGS = {
    INDEXED_DB_NAME : "newDB",
    INDEXED_DB_VERSION: 1,
    INDEXED_STORAGE_NAME: "enterpriseEmployees",
    LOCAL_STORAGE_NAME: 'textList',
    COOKIE_NAME: 'area'
};

/**
 *
 * Класс IdbData - класс для взаимодействия с IndexDB
 *
 * @class
 */

class IdbData {

    /**
     *
     * @param dbName - имя БД
     * @param dbVersion - номер версии БД
     * @param dbStorageName - имя таблицы
     */
    constructor(dbName, dbVersion, dbStorageName) {
        this.dbName = dbName || SETTINGS.INDEXED_DB_NAME;
        this.dbVersion = dbVersion || SETTINGS.INDEXED_DB_VERSION;
        this.dbStorageName = dbStorageName || SETTINGS.INDEXED_STORAGE_NAME;
    }

    /**
     *
     * Делает запрос к IndexDB, предварительно указывая ее имя и версию.
     *
     * @private
     * @returns {Promise<any>} возвращает промис, который имеет либо успешное соединение с БД или ошибочное.
     * В промисе есть переменная request. Он может имееть 3 состояния:
     * a) onerror -  будет вызван в случае возникновения ошибки и получит в параметрах объект ошибки.
     * б) onsuccess -  будет вызван если все прошло успешно, но экземпляр открытой базы данных в качестве параметра метод не получит.
     * в) onupgradeneeded - . Если базы с указанной версией не найдется, то будет вызван onupgradeneeded,
     * в котором можно модифицировать базу, если существует старая версия, или создать базу, если ее вообще не существует.
     *
     */

    parse() {

        const idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;


        const request = idb.open(this.dbName, this.dbVersion);

        return new Promise((resolve, reject) => {

            request.onerror =  (event) => {
                reject("Database error: " + event.target.error.message);
            };

            request.onsuccess = (event) => {
                try {
                    const idb = event.target.result;

                    resolve(idb);
                } catch (e) {
                    new Error("!!!!");
                }
            };

            request.onupgradeneeded = (event) => {
                const idb = event.target.result;

                // Создаем хранилище объектов для этой базы данных, если ее нет
                if (!idb.objectStoreNames.contains(this.dbStorageName)) {
                    const objectStore = idb.createObjectStore(this.dbStorageName, { autoIncrement: true });

                    objectStore.createIndex("text", "text", { unique: true });
                }
            }
        })

    }

    /**
     *
     * метод close закрывает соединение с базой
     *
     */

    close(){
        const db = event.target.result;
        db.close();
    }

    /**
     *
     * Метод save открывает соединение и работает с хранилищем объектов в зависимости от того, в каком режиме доступа
     * указано
     *
     * @param actionDB - режим доступа(чтение или запись)
     * @returns {Promise<IDBObjectStore>} - возвращает хранилище объектов
     */

    async save(actionDB) {

        actionDB = ( typeof actionDB === 'boolean' && actionDB)? "readwrite" : "readonly"
        const db = await this.parse();
        const objStore = db.transaction(this.dbStorageName, actionDB).objectStore(this.dbStorageName);

        return objStore;
    }

    /**
     *
     * Метод getData получает все записи из хранилища и выводит их в констоль
     *
     * @returns {Promise<*>} - возвращает промис, который выводит, в случаи успеха, записи, или пустой массив, в случае ошибки
     */

    async getData() {
        const storage = await this.save(false);
        const data = storage.getAll();

        this.close();

        return new Promise(resolve => {
            data.onsuccess = event => resolve(event.target.result.map((elem)=>elem.text));
            data.onerror = () => resolve([]);
        });
    };

    /**
     *
     * Метод saveOne получает данные из хранилища, для того чтобы добавить указанную строку с именем
     *
     * @param text - строка, которую нужно сохранить
     * @returns {Promise<void>}
     */

    async saveOne(text) {
        const storage = await this.save(true);

        text = text.trim();

        storage.add({text: text});

        this.close();
    };

    /**
     *
     * Метод checkDuplicate получает все данные из хранилища и находит указанную запись, которая === cтроке text
     *
     * @param text - строка, которую необходимо проверить на дубликацию
     * @returns {Promise<*>} - возвращает промис, который,  в случае успеха, выводит, если дублитрованная строка text
     * не найдена, или, в случае ошибки, false
     */

    async checkDuplicate(text) {
        const storage = await this.save(false);

        text = text.trim();

        const data = storage.index('text').get(text);

        return new Promise(resolve => {
            data.onsuccess = event => resolve(!!event.target.result);
            data.onerror = event => resolve(false);
        });
    }

    /**
     *
     *  Метод removeOne получает информацию о дублировании строки text. Если дублирования нет, то происходит удаление
     *  строки text по указанному ключу
     *
     *  @param text - строка для удаления
     *  @returns {Promise<void>}
     */

    async removeOne(text){
        const isDuplicate = await this.checkDuplicate(text);

        if(isDuplicate) {
            const storage = await this.save(true);
            const index = storage.index('text');

            text = text.trim();

            index.getKey(text).onsuccess = function (event) {
                const key = event.target.result;
                storage.delete(key);
            };

            this.close();
        }
    }

    /**
     *
     * метод removeAll получает данные из хранилища и полностью их удаляет
     *
     * @returns {Promise<void>}
     */

    async removeAll(){
        const storage = await this.save(true);

        storage.clear();

        this.close();
    }

    /**
     *
     * метод changeOne получает информацию о дублировании строки oldValue. Если она есть, то происходит циклический поиск
     * строки oldValue. В случае успеха происходит замена на строку newValue
     *
     * @param oldValue - cтарое значение
     * @param newValue - новое значение
     * @returns {Promise<void>}
     */

    async changeOne(oldValue, newValue){

        const isDuplicate = await this.checkDuplicate(oldValue);

        if (isDuplicate) {
            const storage = await this.save(true);

            const index = storage.index('text');

            index.openCursor(oldValue).onsuccess = function () {
                const cursor = event.target.result;

                cursor.update({text: newValue});
            };

            this.close();
        }

    }
}


/**
 *
 * Класс LocalData -  класс для взамиодействия с localStorage
 *
 * @class
 */
class LocalData {

  constructor(storageName) {
      /**
       * listObj - объект для хранения и обмена данными между методами класса
       *
       * @type {Object}
       */
      this.listObj = {};

      this.storageName = storageName || SETTINGS.LOCAL_STORAGE_NAME;
  }

    /**
     * Делает запрос к localStorage и полученные данные превращает из строки в объект
     *
     * @private
     * @param {string} name - имя хранилища в localStorage
     * @returns {Object} - объект с данными LocalStorage либо пустой объект
     */

  parse() {
    if (!localStorage[this.storageName]) {
      localStorage[this.storageName] = '{}';
    }
    
    try {
      this.listObj = JSON.parse(localStorage[this.storageName]);
    } catch (e) {
      return {};
    }
    
    return this.listObj;
  }

    /**
     * Метод getDate получает  данные в формате JSON и конвертирует их в массив
     *
     * @returns {Array} возвращает массив с данными
     */

  getData() {
      this.parse();

      let arr = [];

      for (let elem in this.listObj) {
          arr.push(elem);
      }

      return arr;
  }


    /**
     *
     *  Метод save сохраняет данные в localStorage, перезаписываая старые
     *  @private
     *  @returns {Object} - общий объект с данными из конструктора, куда попадают новые данные для перезаписи localStorage
     *  при сохранении новых записей
     */

  save() {
    localStorage[this.storageName] = JSON.stringify(this.listObj);
    
    return this.listObj;
  }

    /**
     * Метод saveOne сохраняет одну запись в localStorage
     *
     * @param text - cтрока, которую нужно сохранить
     */

  saveOne(text) {
    this.parse();
    
    text = text.trim();
    this.listObj[text] = "1";
    
    this.save();
  }

    /**
     *
     * Метод сheckDuplicate проверяет, чтобы исходная строка text не дублировалась со строкой c таким же значением
     *
     * @private
     * @param text
     * @returns {boolean}, если строка text дублируется в localStorage, то вернется true, иначе false
     */

  checkDuplicate(text) {
    this.parse();
    
    text = text.trim();
    
    return !!this.listObj[text];
  }

    /**
     * Метод removeOne удаляет данные с параметром value из localStorage и сохраняет изменения
     *
     * @param value
     */

  removeOne(value) {
    this.parse();
    
    delete this.listObj[value];
    
    this.save();
  }

    /**
     *
     * Метод removeAll удаляет все данные из localStorage
     *
     */

  removeAll() {
        localStorage.removeItem(this.storageName);
    }

    /**
     *
     * Метод changeOne изменяет старое значение oldValue на новое newValue, предварительно конвертируя их в JSON
     *
     * @param oldValue
     * @param newValue
     */

    changeOne(oldValue, newValue) {
        const structuringDataOld = JSON.stringify(oldValue);
        const structuringDataNew = JSON.stringify(newValue);

        const changeData = localStorage[this.storageName].replace(structuringDataOld, structuringDataNew);

        localStorage[ this.storageName ] = changeData;
    }
}

/**
 *
 * Класс СookieData - класс для взаимодействия с Cookie
 *
 * @class
 */

class CookieData {

    /**
     *
     * @param key
     */
    constructor(key) {
        this.key = key || SETTINGS.COOKIE_NAME
    }

    /**
     *
     * метод replace - удаляет символы из строки value несущие угрозу коду котоыре мог ввести пользователь
     *
     * @param value
     * @returns {string|void|*}
     * @private
     */

    _replace(value) {
        return value.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, '');
    }

    /**
     *
     * encodeURIComponent() - метод, кодирующий компонент универсального идентификатора ресурса (URI)
     * заменой каждой определенной последовательности символов одной, двумя, тремя или четырьмя последовательностями символов,
     * представленных в кодировке UTF-8
     *
     *
     *
     * @param value
     * @returns {*} - возвращает закодированную строку, в которой отстутствуют подозрительные символы
     * @private
     */

    _encode(value) {
        return this._replace(encodeURIComponent(String(value)));
    }

    /**
     *
     * Метод decodeURIComponent() декодирует управляющие последовательности символов,
     * созданные с помощью метода encodeURIComponent
     *
     * @param value - строка для декодирования
     * @returns {string} - возвращается декадированная строка
     * @private
     */

    _decode(value) {
        return decodeURIComponent(String(value));
    }


    /**
     *
     * метод set становит cookie c именем key и значениям value
     *
     * @param value - значение cookie : строка value
     * @param attr - oбъект с дополнительными свойствами для установки cookie:
     *  - expries - время истечения cookie.
     *  - path - путь для куки
     *  - domain - домен для cookie.
     *  - secure - свойство-флаг разрешающий посылать браузуру куку только при https соединении
     *
     * @returns {string} - возвращается запись куки в формате name=значение; expires=дата; path=путь;
     domain=домен; secure" в виде строки
     */


    set(value, attr = {}) {
        if (typeof document === 'undefined' || !this.key || typeof attr !== 'object') return;

        if (attr.expires && typeof attr.expires === 'number') {
// attr.expires = new Date(new Date() 1 + attr.expires 1000 60 60 * 24);
            attr.expires = new Date(new Date()  * 1 + attr.expires * 864e+5);
        }

        attr.expires = (attr.expires) ? attr.expires.toUTCString() : '';

        this.key = this._encode(this.key);
        value = this._encode(value);

        attr.path = (attr.path) ? attr.path : '/';
        attr.domain = (attr.domain) ? attr.domain : '';
        attr.secure = (attr.secure) ? "secure" : '';

        let stringAttributes = '';

        for (let keyAttr in attr) {
            if (!attr.hasOwnProperty(keyAttr)) continue;

            if (attr[keyAttr]) {
                if (keyAttr !== "secure") {
                    stringAttributes += '; ' + keyAttr + '=' + attr[ keyAttr ];
                } else {
                    stringAttributes += '; ' + keyAttr;
                }
            }
        }

        return (document.cookie = this.key + '=' + value + stringAttributes);
    }

    /**
     *
     * метод get производит поиск куки по заданному шаблону
     *
     * @returns {Array} - возращает перекодированное значение
     */

    get() {
        if (typeof document === 'undefined' || !this.key || typeof this.key !== 'string') return [];

        let cookies = document.cookie ? document.cookie.match('(^|;) ?' + this.key + '=([^;]*)(;|$)') : [];

        return this._decode(cookies[2]);
    }

    /**
     *
     * метод remove "удаляет" куки из браузера посредством установки срока хранения на одну секунду раньше текущего значения времени.
     *
     * @returns {string} - возвращает пустую куку
     */

    remove() {
        return this.set('', { expires: -1 });
    }
}

/**
 * Класс Manager - это класс взаимодействия с LocalStorage и IndexDB. Manager будет вызывать один из классов взависимости
 * от условия, которое проверяет существование IndexDB
 *
 * @class
 * @params {object} localData, idbData - это переменные, которые ссылаются на объекты LocalStorage и IndexDB
 */
class Manager {
    constructor(localData, idbData) {
        this.localData = localData;
        this.idbData = idbData;
    }

    /**
     *
     * Метод managerData - управляющий метод, который, взависимости от условия, определяет какой объект возвращать
     * localStorage или IndexDB
     *
     * @private
     * @returns {*}
     */

    managerData(){
        const idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

        if (!idb) {
            return this.localData;
        } else {
            return this.idbData;
        }
    };

    /**
     *
     * Метод saveOne вызывает метод saveOne одного из объектов(взависимости от this)
     *
     * @param text - cтрока, которую нужно сохранить в одну из объектов
     */

    saveOne(text) {
        this.managerData().saveOne(text);
    }

    /**
     *
     * Метод  checkDuplicate вызывает метод  checkDuplicate одного из объектов(взависимости от this)
     *
     * @param text - строка, которую нужно проверить на дубликацию
     */

    checkDuplicate(text) {
        this.managerData().checkDuplicate(text);
    }

    /**
     *
     * Метод  changeOne вызывает метод  changeOne одного из объектов(взависимости от this)
     *
     * @param oldValue - старое значение
     * @param newValue - новое значение, на которое нужно заменить старое
     */

    changeOne(oldValue, newValue) {
        this.managerData().changeOne(oldValue, newValue);
    }

    /**
     *
     * Метод removeAll вызывает метод removeAll одного из объектов(взависимости от this)
     *
     */

    removeAll() {
        this.managerData().removeAll();
    }

    /**
     *
     * Метод removeOne вызывает метод removeOne одного из объектов(взависимости от this)
     *
     * @param text - строка, которую нужно удалить
     */

    removeOne(text) {
        this.managerData().removeOne(text);
    }

    /**
     *
     * Метод  getData вызывает метод  getData одного из объектов(взависимости от this)
     *
     * @returns {Promise<*>|Array|*|string} - возвращает массив с данными, причем в случае с IndexDB данные будут проходить
     * асинхронно
     */

     getData() {
       return this.managerData().getData();
    }
};


const localData = new LocalData();
const idData = new IdbData();
const manager = new Manager(localData, idData);


/**
 *
 * Класс ViewList - класс, который создает DOM элемент параграф и тег span. И прикрепляет их к веб-странице
 * @class
 */

class ViewList {

    constructor() {}

    wrapperTags(text) {
        const elemTagP = doc.createElement('p'); // создаем элементы тег p и тег span
        const elemTagSpanCross = doc.createElement('span');
        const elemTagSpanPen = doc.createElement('span');

        elemTagSpanCross.className = "delete"; //прикрепляем к тегу span, класс с СSS свойствами
        elemTagSpanPen.className = "edit";

        elemTagP.appendChild(doc.createTextNode(text)); //создаем и прикрепляем текст к параграфу

        elemTagSpanCross.appendChild(doc.createTextNode(' ' +String.fromCharCode(10006))); //создаем крест и прикрепляем его к тегу span

        elemTagSpanPen.appendChild(doc.createTextNode(' ' +String.fromCharCode(9998)));

        elemTagP.appendChild(elemTagSpanCross);  //прикрепляет span k p
        elemTagP.appendChild(elemTagSpanPen);

        docObj.listNotes.appendChild(elemTagP); //прикрепляет p к div
    }

    /**
     *
     * Метод showList отображает созданный DOM элемент на веб страницу, причем если на входе не подается параметр elem
     * и в текстовом поле пользователь не напечатал текст, то изменения на странице не происходят
     *
     * @param elem
     */

    showList(elem) {
        const field = docObj.textArea;

        if (field.value.trim().length && elem){
           console.log(docObj.listNotes);
        } else {
            this.wrapperTags(field.value)
        }

    }
}

/**
 *
 * Класс ViewCleaner - это класс, который занимается  отчисткой данных на странице
 *
 * @class
 */


class ViewCleaner {

  constructor() {}

    /**
     *
     * метод clearList удаляет DOM элемент из страницы
     *
     */

  сlearList() {
      const parentElem = docObj.listNotes;

      if (parentElem.hasChildNodes()) {
          parentElem.innerHTML = "";
      }
  }

    /**
     *
     * метод clearArea чистит текстовое поле (textArea)
     *
     */

  clearArea() {
      const  textField = docObj.textArea;

      if (textField.value !== "") {
          textField.value = "";
      }
  }
}

/**
 *
 * Функция  bufferTagNote - функция, которая временно хранит  данные в переменной _bufferTag, возращая объект со свойствами:
 *
 * @type {function(): {set(*=, *): void, get(): *, clear(): void}}
 */

const bufferTagNote = (function () {
   let _bufferTag = '';

   return {

       /**
        *
        * Метод set записывает данные в переменную  _bufferTag
        *
        * @param text
        * @param span
        */

       set(text, span){
           if(text && span){
             _bufferTag = text + "|" + span;
           }
       },

       /**
        *
        * метод get получает данные из переменной  _bufferTag
        *
        * @returns {string} возращаются данные в виде строки
        */

       get() {
         return _bufferTag;
       },

       /**
        *
        * метод сlear стирает данные из перемеенной  _bufferTag
        *
        */

       clear() {
           _bufferTag = '';
       }
   }
});

const bufferElemNote = (function () {
    let _bufferElem = '';

    return {
        set(elem) {
            if (elem) {
                _bufferElem = elem;
            }
        },

         get() {
             return _bufferElem;
         },

         clear() {
            _bufferElem = '';
        }
    }
});


const linkObjTag= bufferTagNote();
const linkObjElem = bufferElemNote();

/**
 *
 * Функция deleteRecord - удаляет текстовое содержимое с Cookie, IndexDB или localStorage. DOM элемент с текстом также
 * удаляется из страницы.
 *
 * @param event -то переменная, которая указвает на DOM элемент, где произошло событие
 */

function deleteRecord(event) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target;

    if (target.classList.contains('delete')) {
        const  parent = target.parentElement;
        const textTemporary = parent.innerText.replace(String.fromCharCode(10006),"");
        const text = textTemporary.replace(String.fromCharCode(9998), "");

        docObj.listNotes.removeChild(parent);
        manager.removeOne(text.trim());

    } else if(target.tagName === "P") {
        const textTemporary = target.innerText.replace(String.fromCharCode(10006),"");
        const text = textTemporary.replace(String.fromCharCode(9998), "");

        docObj.listNotes.removeChild(target);
        manager.removeOne(text.trim());
    }
}

/**
 *
 * Функция saveRecord - функция, которая сохраняет данные из текстового поля(введенного пользователем) в Сookie, LocalStorage
 * или IndexDB. Прежде чем сохранить, происходит проверка строки на длину и дубликацию(если строка уже сохранялась ранее, то сохранение
 * не происходит
 *
 * @param event - это переменная, которая указвает на DOM элемент, где произошло событие
 */


function saveRecord(event)  {
          event.preventDefault();

          const cookieData = new CookieData();
          const field = docObj.textArea;

          if (linkObjTag.get() !== "") {
              const  information = linkObjTag.get();
              const elem = linkObjElem.get();
              const arr = information.split("|");

              elem.childNodes[0].remove();
              elem.insertBefore(doc.createTextNode(docObj.textArea.value), elem.querySelector(".delete"));
              docObj.listNotes.insertBefore(elem, elem.nextSibling);

              manager.changeOne(arr[0].trim(), docObj.textArea.value);
              cookieData.set(docObj.textArea.value);
              bufferTagNote().clear();
              new ViewList().showList(arr[1]);

          } else  if (!(manager.checkDuplicate(field.value)) && (field.value.trim().length)) {
              manager.saveOne(field.value);
              cookieData.set(field.value);
              new ViewList().showList();
          }
}


docObj.listNotes.addEventListener('click', (event) => {
    const target = event.target;

    if (target.classList.contains('edit')) {
        const  parent = target.parentElement;
        const textTemporary = parent.innerText.replace(String.fromCharCode(10006),"");
        const text = textTemporary.replace(String.fromCharCode(9998), "");

        docObj.textArea.value= text.trim();
        linkObjTag.set(text,target.nodeName);
        linkObjElem.set(parent);
    }
});

docObj.saveButton.addEventListener('click', saveRecord);



docObj.clearListButton.addEventListener('click', (event) =>  {
  event.preventDefault();

  manager.removeAll();
  new ViewCleaner().сlearList();
});

docObj.clearAreaButton.addEventListener('click', (event) => {
    new CookieData().remove();
    new ViewCleaner().clearArea();
});

docObj.listNotes.addEventListener('click', deleteRecord);

/**
 *
 * При перезагрузки страницы данные берутся из хранилища данных и выводятся в текстовое поле и в виде списка на странице
 * @returns {Promise<void>}
 */

window.onload = async () => {
    const cookieData = new CookieData().get();

    docObj.textArea.value = (cookieData === "undefined") ? " " :  cookieData;
    const listObj = await manager.getData();

    for (let elem of listObj) {
        new ViewList().wrapperTags(elem);
    }
};







