const doc = document;

//delete window.indexedDB;

const docObj = {
  textArea: doc.getElementsByTagName('textarea')[0],
  saveButton: doc.getElementsByTagName('button')[0],
  clearAreaButton: doc.getElementsByTagName('button')[1],
  clearListButton: doc.getElementsByTagName('button')[2],
  listNotes: doc.getElementById('listNotes'),
  tagP: doc.getElementsByTagName('p')
};

const SETTINGS = {
    INDEXED_DB_NAME : "newDB",
    INDEXED_DB_VERSION: 1,
    INDEXED_STORAGE_NAME: "enterpriseEmployees",
    LOCAL_STORAGE_NAME: 'textList',
    COOKIE_NAME: 'area'
};

class IdbData {
    constructor(dbName, dbVersion, dbStorageName) {
        this.dbName = dbName || SETTINGS.INDEXED_DB_NAME;
        this.dbVersion = dbVersion || SETTINGS.INDEXED_DB_VERSION;
        this.dbStorageName = dbStorageName || SETTINGS.INDEXED_STORAGE_NAME;
    }

    parse() { // метод parse - возвращает Promise, в котором cпрятан объект IndDataBase

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

    close(){
        const db = event.target.result;
        db.close();
    }

    async save(actionDB) {

        actionDB = ( typeof actionDB === 'boolean' && actionDB)? "readwrite" : "readonly"
        const db = await this.parse();
        const objStore = db.transaction(this.dbStorageName, actionDB).objectStore(this.dbStorageName);

        return objStore;
    }

    async getData() {
        const storage = await this.save(false);
        const data = storage.getAll();

        this.close();

        return new Promise(resolve => {
            data.onsuccess = event => resolve(event.target.result.map((elem)=>elem.text));
            data.onerror = () => resolve([]);
        });
    };

    async saveOne(text) {
        const storage = await this.save(true);

        text = text.trim();

        storage.add({text: text});

        this.close();
    };

    async checkDuplicate(text) {
        const storage = await this.save(false);

        text = text.trim();

        const data = storage.index('text').get(text);

        return new Promise(resolve => {
            data.onsuccess = event => resolve(!!event.target.result);
            data.onerror = event => resolve(false);
        });
    }

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

    async removeAll(){
        const storage = await this.save(true);

        storage.clear();

        this.close();
    }

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


class LocalData {
  constructor(storageName) {
    this.storageName = storageName || SETTINGS.LOCAL_STORAGE_NAME;
    
    this.listObj = {};
  }
  
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

  getData() {
      this.parse();

      let arr = [];

      for (let elem in this.listObj) {
          arr.push(elem);
      }

      return arr;
  }


  save() {
    localStorage[this.storageName] = JSON.stringify(this.listObj);
    
    return this.listObj;
  }
  saveOne(text) {
    this.parse();
    
    text = text.trim();
    this.listObj[text] = "1";
    
    this.save();
  }
  checkDuplicate(text) {
    this.parse();
    
    text = text.trim();
    
    return !!this.listObj[text];
  }
  removeOne(value) {
    this.parse();
    
    delete this.listObj[value];
    
    this.save();
  }

  removeAll() {
        localStorage.removeItem(this.storageName);
    }


    changeOne(oldValue, newValue) {
        const structuringDataOld = JSON.stringify(oldValue);
        const structuringDataNew = JSON.stringify(newValue);

        const changeData = localStorage[this.storageName].replace(structuringDataOld, structuringDataNew);

        localStorage[ this.storageName ] = changeData;
    }
}


class CookieData {
    constructor(key) {
        this.key = key || SETTINGS.COOKIE_NAME
    }

    _replace(value) {
        return value.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, '');
    }

    _encode(value) {
        return this._replace(encodeURIComponent(String(value)));
    }

    _decode(value) {
        return decodeURIComponent(String(value));
    }


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

    get() {
        if (typeof document === 'undefined' || !this.key || typeof this.key !== 'string') return [];

        let cookies = document.cookie ? document.cookie.match('(^|;) ?' + this.key + '=([^;]*)(;|$)') : [];

        return this._decode(cookies[2]);
    }

    remove() {
        return this.set('', { expires: -1 });
    }
}

class Manager {
    constructor(localData, idbData) {
        this.localData = localData;
        this.idbData = idbData;
    }

    managerData(){
        const idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

        if (!idb) {
            return this.localData;
        } else {
            return this.idbData;
        }
    };

    saveOne(text) {
        this.managerData().saveOne(text);
    }

    checkDuplicate(text) {
        this.managerData().checkDuplicate(text);
    }

    changeOne(oldValue, newValue) {
        this.managerData().changeOne(oldValue, newValue);
    }

    removeAll() {
        console.log(this.managerData());
        this.managerData().removeAll();
    }

    removeOne(text) {
        this.managerData().removeOne(text);
    }

     getData() {
       return this.managerData().getData();
    }
};


const localData = new LocalData();
const idData = new IdbData();

const manager = new Manager(localData, idData);

class ViewList { // Класс, который отображает элементы из localStorage на страницу

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

    showList(elem) {
        const field = docObj.textArea;

        if (field.value.trim().length && elem){
           console.log(docObj.listNotes);
        } else {
            this.wrapperTags(field.value)
        }

    }
}


class ViewCleaner {

  constructor() {}

  сlearList() {
      const parentElem = docObj.listNotes;

      if (parentElem.hasChildNodes()) {
          parentElem.innerHTML = "";
      }
  }

  clearArea() {
      const  textField = docObj.textArea;

      if (textField.value !== "") {
          textField.value = "";
      }
  }
}

const bufferTagNote = (function () {
   let _bufferTag = '';

   return {
       set(text, span){
           if(text && span){
             _bufferTag = text + "|" + span;
           }
       },

       get() {
         return _bufferTag;
       },

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

function selectRecord(event) {
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

docObj.listNotes.addEventListener('click', selectRecord);

window.onload = async () => {
    const cookieData = new CookieData().get();

    docObj.textArea.value = (cookieData === "undefined") ? " " :  cookieData;
    const listObj = await manager.getData();

    for (let elem of listObj) {
        new ViewList().wrapperTags(elem);
    }
};







