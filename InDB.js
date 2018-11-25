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

    async save() {
        const db = await this.parse();
        const objStore = db.transaction(this.dbStorageName, "readwrite").objectStore(this.dbStorageName);

        return objStore;
    }

    async getData() {
        const storage = await this.save();
        const data = storage.getAll();

        this.close();

        data.onsuccess = function () {
            console.log(data.result);
        };

        data.onerror = function() {
            console.log("Почему не вывелись данные на экран!!!");
        }
    };

    async add(text) {
        const storage = await this.save();

        text = text.trim();

        storage.add({text: text});

        this.close();
    };
}


const db = new IdbData();
db.add('some');
db.add("fff");
db.getData();