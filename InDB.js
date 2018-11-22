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

                    objectStore.createIndex("name", "name", { unique: true });
                }
            }
        })

    }

    async add(data) {
        const db = await this.parse();
        const transaction = db.transaction(this.dbStorageName, "readwrite");
        const objectStore = transaction.objectStore(this.dbStorageName);
        
        for (let i in data) {
          objectStore.add(data[i]);
        }
    }
}


const db = new IdbData();
console.log(db.add([
    { ssn: "444-44-4444", name: "Bill", age: 36, email: "bill@company.com" },
    { ssn: "555-55-5555", name: "Donna", age: 22, email: "donna@home.org" }
]));