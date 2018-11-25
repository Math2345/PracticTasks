const SETTINGS = {
      INDEXED_DB_NAME : "newDB",
      INDEXED_DB_VERSION: 1,
      INDEXED_STORAGE_NAME: "enterpriseEmployees"
};

const idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

class IdbData {
    constructor(dbName, dbVersion, dbStorageName) {
       this.dbName = dbName || SETTINGS.INDEXED_DB_NAME;
       this.dbVersion = dbVersion || SETTINGS.INDEXED_DB_VERSION;
       this.dbStorageName = dbStorageName || SETTINGS.INDEXED_STORAGE_NAME;
    }

    parse() { // метод parse - возвращает Promise, в котором cпрятан объект IndDataBase
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
            data.onsuccess = event => resolve(event.target.result);
            data.onerror = () => resolve({});
        });
    };

    async add(text) {
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
const db = new IdbData();
db.removeAll();
db.add("some");
db.add("test");
db.add("test2");
//db.add("max");
//
// db.removeOne("some");
//db.changeOne("max", "9999");
//db.getData().then( (r) => console.log(r));