const doc = document;

const docObj = {
  textArea: doc.getElementsByTagName('textarea')[0],
  saveButton: doc.getElementsByTagName('button')[0],
  clearAreaButton: doc.getElementsByTagName('button')[1],
  clearListButton: doc.getElementsByTagName('button')[2],
  listNotes: doc.getElementById('listNotes'),
  tagP: doc.getElementsByTagName('p')
};

const SETTINGS = {
  LOCAL_STORAGE_NAME: 'textList',
  COOKIE_NAME: 'area'
};


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


// const localData = new LocalData(settings.LOCAL_STORAGE_NAME);
// console.log(localData.parse());
// localData.removeOne('some text12');
// localData.changeOne('some textdfdfdf', "12345");



class CookieData {
  constructor(key) {
    this.key = key || SETTINGS.COOKIE_NAME;
  }
  
  _replace(value) {
    return value.replace(/(<|>|_|@|{|}|\[|\])/g, '');
  }
  
  _encode(value) {
    return this._replace(encodeURIComponent(String(value)));
  }
  
  _decode(value) {
    return this._replace(decodeURIComponent(String(value)));
  }
  
  set(value, attr = {}) {
    if (typeof document === 'undefined' || !this.key || typeof attr !== 'object') return;
    
    if (attr.expires && typeof attr.expires === 'number') {
      // attr.expires = new Data(new Data() * 1 + attr.expires * 100 * 60 * 60 * 24)
      attr.expires = new Date(new Date() * 1 + attr.expires * 864e+5);
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
    if (typeof document === 'undefined' || !this.key || typeof key !== 'string') return [];
  
    let cookies = document.cookie ? document.cookie.match('(^|;) ?' + this.key + '=([^;]*)(;|$)') : [];
  
    return this._decode(cookies[2]);
  }
  
  remove() {
    return this.set(this.key, '', { expires: -1 });
  }
}

// new CookieData.set("area", "awesome text", { expires: 7, path: '' });
// new CookieData.set("area", "awesome text", { expires: 7, secure: false });
// new CookieData().set(settings.COOKIE_NAME, "new 55↵text<>lkj@_dfdf");
//  new CookieData().set("area", "some text", { expires: 7 });
// console.log(new CookieData().get(settings.COOKIE_NAME));
//  console.log(new CookieData().remove("area"));


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

    showList() {
        const field = docObj.textArea;

        if (field.value.trim().length) {
            this.wrapperTags(field.value);
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
       set(tag){
           if(tag){
             _bufferTag = tag;
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


const linkObj = bufferTagNote();

function selectRecord(event) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target;

    if (target.classList.contains('delete')) {
        const  parent = target.parentElement;
        const textTemporary = parent.innerText.replace(String.fromCharCode(10006),"");
        const text = textTemporary.replace(String.fromCharCode(9998), "");

        docObj.listNotes.removeChild(parent);
        new LocalData().removeOne(text.trim());

    } else if(target.tagName === "P") {
        const textTemporary = target.innerText.replace(String.fromCharCode(10006),"");
        const text = textTemporary.replace(String.fromCharCode(9998), "");

        docObj.listNotes.removeChild(target);
        new LocalData().removeOne(text.trim());
    }
}


function saveRecord(event)  {
          event.preventDefault();

          const localData = new LocalData();
          const cookieData = new CookieData();
          const field = docObj.textArea;

          if (linkObj.get() !== "") {
              const  text = linkObj.get();

              localData.changeOne(text.trim(), docObj.textArea.value);
              cookieData.set(docObj.textArea.value);
          }

          if (!(localData.checkDuplicate(field.value)) && (field.value.trim().length)) {
              localData.saveOne(field.value);
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
        linkObj.set(text);
    }
});

docObj.saveButton.addEventListener('click', saveRecord);



docObj.clearListButton.addEventListener('click', (event) =>  {
  event.preventDefault();
  new LocalData().removeAll();
  new ViewCleaner().сlearList();
});

docObj.clearAreaButton.addEventListener('click', (event) => {
    new CookieData().remove();
    new ViewCleaner().clearArea();
});

docObj.listNotes.addEventListener('click', selectRecord);




window.onload = () => {
    const cookieData = new CookieData();
    const localData = new LocalData();

    docObj.textArea.value =  (cookieData.get() === "undefined") ? " " :  cookieData.get();
    const listObj = localData.parse();

    for (let elem in listObj) {
        new ViewList().wrapperTags(elem);
    }
};







