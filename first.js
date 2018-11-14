const doc = document;

const docObj = {
  textArea: doc.getElementsByTagName('textarea')[0],
  saveButton: doc.getElementsByTagName('button')[0],
  clearAreaButton: doc.getElementsByTagName('button')[1],
  clearListButton: doc.getElementsByTagName('button')[2],
  listNotes: doc.getElementById('listNotes'),
  tagP: doc.getElementsByTagName('p')
};

const settings = {
  LOCAL_STORAGE_NAME: 'textList',
  COOKIE_NAME: 'area'
};


class LocalData {
  constructor(storageName) {
    this.storageName = storageName;
    
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

        const changeData = localStorage[this.storageName].replace(structuringDataOld, structuringDataNew)

        localStorage[ this.storageName ] = changeData;
    }
}


// const localData = new LocalData(settings.LOCAL_STORAGE_NAME);
// console.log(localData.parse());
// localData.removeOne('some text12');
// localData.changeOne('some textdfdfdf', "12345");



class CookieData {
  constructor() {}
  
  _replace(value) {
    return value.replace(/(<|>|_|@|{|}|\[|\])/g, '');
  }
  
  _encode(value) {
    return this._replace(encodeURIComponent(String(value)));
  }
  
  _decode(value) {
    return this._replace(decodeURIComponent(String(value)));
  }
  
  set(key, value, attr = {}) {
    if (typeof document === 'undefined' || !key || typeof attr !== 'object') return;
    
    if (attr.expires && typeof attr.expires === 'number') {
      // attr.expires = new Data(new Data() * 1 + attr.expires * 100 * 60 * 60 * 24)
      attr.expires = new Date(new Date() * 1 + attr.expires * 864e+5);
    }
  
    attr.expires = (attr.expires) ? attr.expires.toUTCString() : '';
  
    key = this._encode(key);
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
  
    return (document.cookie = key + '=' + value + stringAttributes);
  }
  
  get(key) {
    if (typeof document === 'undefined' || !key || typeof key !== 'string') return [];
  
    let cookies = document.cookie ? document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)') : [];
  
    return this._decode(cookies[2]);
  }
  
  remove(key) {
    return this.set(key, '', { expires: -1 });
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
        const elemTagSpan = doc.createElement('span');

        elemTagSpan.className = "delete"; //прикрепляем к тегу span, класс с СSS свойствами


        elemTagP.appendChild(doc.createTextNode(text)); //создаем и прикрепляем текст к параграфу

        elemTagSpan.appendChild(doc.createTextNode(' ' +String.fromCharCode(10006))); //создаем крест и прикрепляем его к тегу span

        elemTagP.appendChild(elemTagSpan);  //прикрепляет span k p

        docObj.listNotes.appendChild(elemTagP); //прикрепляет p к div
    }

    showList() {
        const field = docObj.textArea;
        const localdata = new LocalData(settings.LOCAL_STORAGE_NAME);

        if (field.value.trim().length && !(localdata.checkDuplicate(field.value))) {

                localdata.saveOne(field.value);
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


docObj.saveButton.addEventListener('click', (event) => {
  event.preventDefault();
  new ViewList().showList();
});


docObj.clearListButton.addEventListener('click', (event) =>  {
  event.preventDefault();
  new LocalData().removeAll(settings.LOCAL_STORAGE_NAME);
  new ViewCleaner().сlearList();
});

docObj.clearAreaButton.addEventListener('click', (event) => {
  new ViewCleaner().clearArea();
});





