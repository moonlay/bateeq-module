'use strict';

// external deps 
var ObjectId = require('mongodb').ObjectId;

// internal deps
require('mongodb-toolkit');
var BateeqModels = require('bateeq-models');
var map = BateeqModels.map;
var BaseManager = require('module-toolkit').BaseManager;
var Inventory = BateeqModels.inventory.Inventory;
var InventoryMovement = BateeqModels.inventory.InventoryMovement;

module.exports = class InventoryManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.inventory.Inventory);
        this.inventoriesCollection = this.db.use(map.inventory.Inventory);
        this.inventoryMovementCollection = this.db.use(map.inventory.InventoryMovement);

        var StorageManager = require('../master/storage-manager');
        this.storageManager = new StorageManager(db, user);

        var ItemManager = require('../master/item-manager');
        this.itemManager = new ItemManager(db, user);

        var ProductManager = require('../master/product-manager');
        this.productManager = new ProductManager(db, user);

        var InventoryMovementManager = require('./inventory-movement-manager');
        this.inventoryMovementManager = new InventoryMovementManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterItemCode = {
                'item.code': {
                    '$regex': regex
                }
            };
            var filterItemName = {
                'item.name': {
                    '$regex': regex
                }
            };
            var filterStorageName = {
                'storage.name': {
                    '$regex': regex
                }
            };
            keywordFilter = {
                '$or': [filterCode]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    readByStorageId(storageId, paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);
        return new Promise((resolve, reject) => {
            var sorting = {
                "_createdDate": -1
            };
            var deleted = {
                _deleted: false
            };
            var storage = {
                storageId: new ObjectId(storageId)
            };
            var query = {
                '$and': [deleted, storage]
            };

            if (_paging.keyword) {
                _paging.keyword = (_paging.keyword.replace('(', '\\(')).replace(')', '\\)');
                var regex = new RegExp(_paging.keyword, "i");
                var filterCode = {
                    'item.code': {
                        '$regex': regex
                    }
                };
                var filterName = {
                    'item.name': {
                        '$regex': regex
                    }
                };
                var filterArticle = {
                    'item.article.realizationorder': {
                        '$regex': regex
                    }
                };
                var filterDomesticSale = {
                    'item.domesticsale': {
                        '$regex': regex
                    }
                };
                var $or = {
                    '$or': [filterCode, filterName, filterArticle, filterDomesticSale]
                };

                query['$and'].push($or);
            }

            var _select = ["storageId", "storage.code", "storage.name", "itemId", "item.code", "item.name", "item.article.realizationOrder", "quantity", "item.domesticSale"];


            this.collection
                .where(query)
                .select(_select)
                .execute()
                .then((results) => {
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    // getSingleById(id) {
    //     return new Promise((resolve, reject) => {
    //         if (id === '')
    //             resolve(null);
    //         var query = {
    //             _id: new ObjectId(id),
    //             _deleted: false
    //         };
    //         this.getSingleByQuery(query)
    //             .then(inventory => {
    //                 resolve(inventory);
    //             })
    //             .catch(e => {
    //                 reject(e);
    //             });
    //     });
    // }

    // getSingleByIdOrDefault(id) {
    //     return new Promise((resolve, reject) => {
    //         if (id === '')
    //             resolve(null);
    //         var query = {
    //             _id: new ObjectId(id),
    //             _deleted: false
    //         };
    //         this.getSingleByQueryOrDefault(query)
    //             .then(inventory => {
    //                 resolve(inventory);
    //             })
    //             .catch(e => {
    //                 reject(e);
    //             });
    //     });
    // }

    _getQueryQ(paging) {
        var deletedFilter = {
            _deleted: false
        }, 
        
        keywordFilter = {};
        
        var queryq = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterItemCode = {
                'item.code': {
                    '$regex': regex
                }
            };
            var filterItemName = {
                'item.name': {
                    '$regex': regex
                }
            };
            var filterArticle = {
                'item.article.realizationorder': {
                    '$regex': regex
                }
            };
            keywordFilter = {
                '$or': [filterItemCode, filterItemName, filterArticle]
            };
        }
        queryq = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return queryq;
    }


    _getQtyCurrentStocks(code, paging){
        var queryq = this._getQueryQ(paging);
        queryq = Object.assign(queryq, {
            "storage._id": new ObjectId(code),
            quantity:{$gt:0}
        });
        let currentQtyItems = [
            {
                $match:queryq
            },
            {
                $group: {
                    _id: { storageId: "$storage._id", itemCode: "$item.code" },
                    storageCode: { $first: "$storage.code" },
                    storageName: { $first: "$storage.name" },
                    itemName: { $first: "$item.name" },
                    Qty : { $first: "$quantity" }
                }
            },

            {$project: {
                _id:  
                { storageId: "$_id.storageId",
                  storageCode: "$storageCode",
                  storageName: "$storageName",
                  itemCode:  "$_id.itemCode",
                  itemName: "$itemName",
                  Qtynya : "$Qty"}}}]
       
                  let query = this.inventoriesCollection.aggregate(currentQtyItems, { allowDiskUse: true }).toArray();
        return query;
    }

    _getAgeCurrentItems(code,paging) {
       var querya = this._getQueryQ(paging);
        querya = Object.assign(querya, {
            "storage._id": new ObjectId(code),
            "type" :"IN"
        });
        let currentAgeItems = [
            {
                $match:querya
            },
            { $sort: { _createdDate:-1 } },

            {
                $group: {
                    _id: { storageId: "$storage._id", itemCode: "$item.code" },
                    storageCode: { $first: "$storage.code" },
                    storageName: { $first: "$storage.name" },
                    itemName: { $first: "$item.name" },
                    Tanggal :{ $first: "$_createdDate" }
                }
            },

            {$project: {
                _id:  
                { storageId: "$_id.storageId",
                  storageCode: "$storageCode",
                  storageName: "$storageName",
                  itemCode:  "$_id.itemCode",
                  itemName: "$itemName",
                  createdDate : "$Tanggal",
                  Selisih_Hari: { $trunc: {$divide: [{ $subtract: [new Date(),'$Tanggal'] },1000 * 60 * 60 * 24]}}}}}]
       
                  let query = this.inventoryMovementCollection.aggregate(currentAgeItems, { allowDiskUse: true }).toArray();
        return query;
    }

    _combineStocks(QtyItems,AgeItems) {
        let allStocks = [];
        QtyItems.forEach(item => {
            let stock = {
                storagename: item._id.storageName,
                itemcode : item._id.itemCode,
                itemname : item._id.itemName,
                quantity: item._id.Qtynya,
            };
            let found = AgeItems.find(es => { return item._id.itemCode === es._id.itemCode });
            if (found) {
                stock.storagecode = found._id.storageCode,
                stock.sls = found._id.Selisih_Hari;
            }
            allStocks.push(stock);
       });

        return allStocks;
    }

    getOverallStock(storageId, query) {
        let QtyItemsQuery = this._getQtyCurrentStocks(storageId, query);
        let AgeItemsQuery = this._getAgeCurrentItems(storageId, query);
        return new Promise((resolve, reject) => {
            return Promise.all([QtyItemsQuery, AgeItemsQuery])
                .then(results => {
                    let QtyItems = results[0];
                    let AgeItems = results[1];
                    let finalStocks = this._combineStocks(QtyItems,AgeItems);
                    resolve(finalStocks);
                })
        })
    }

    getByStorageIdAndItemId(storageId, itemId) {
        return new Promise((resolve, reject) => {
            if (storageId === '' || itemId === '')
                resolve(null);
            var query = {
                storageId: new ObjectId(storageId),
                itemId: new ObjectId(itemId),
                _deleted: false
            };
            this.getSingleByQueryOrDefault(query)
                .then(inventory => {
                    resolve(inventory);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }


    getByStorageIdAndItemIdOrDefault(storageId, itemId) {
        return new Promise((resolve, reject) => {
            if (storageId === '' || itemId === '')
                resolve(null);
            var query = {
                storageId: new ObjectId(storageId),
                itemId: new ObjectId(itemId),
                _deleted: false
            };
            this.getSingleByQueryOrDefault(query)
                .then(inventory => {
                    resolve(inventory);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    // getSingleByQuery(query) {
    //     return new Promise((resolve, reject) => {
    //         this.collection
    //             .single(query)
    //             .then(inventory => {
    //                 resolve(inventory);
    //             })
    //             .catch(e => {
    //                 reject(e);
    //             });
    //     })
    // }

    // getSingleByQueryOrDefault(query) {
    //     return new Promise((resolve, reject) => {
    //         this.collection
    //             .singleOrDefault(query)
    //             .then(inventory => {
    //                 resolve(inventory);
    //             })
    //             .catch(e => {
    //                 reject(e);
    //             });
    //     })
    // }

    create(inventory) {
        return new Promise((resolve, reject) => {
            this._validate(inventory)
                .then(validInventory => {
                    validInventory._createdDate = new Date();
                    this.collection.insert(validInventory)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    update(inventory) {
        return new Promise((resolve, reject) => {
            this._validate(inventory)
                .then(validInventory => {
                    this.collection.update(validInventory)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    delete(inventory) {
        return new Promise((resolve, reject) => {
            this._validate(inventory)
                .then(validInventory => {
                    validInventory._deleted = true;
                    this.collection.update(validInventory)
                        .then(id => {
                            resolve(id);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    getProductInventory(storageId, productId) {
        var query = {
            '$and': [{
                storageId: new ObjectId(storageId)
            }, {
                productId: new ObjectId(productId)
            }, {
                _deleted: false
            }]
        };

        return new Promise((resolve, reject) => {
            this.collection
                .singleOrDefault(query)
                .then(inventory => {
                    if (inventory)
                        resolve(inventory);
                    else {
                        var newInventory = new Inventory({
                            storageId: new ObjectId(storageId),
                            productId: new ObjectId(productId)
                        });
                        this.create(newInventory)
                            .then(docId => {
                                this.getSingleById(docId)
                                    .then(inventory => {
                                        resolve(inventory);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                            })
                            .catch(e => {
                                reject(e);
                            });
                    }
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    getInventory(storageId, itemId) {
        var query = {
            '$and': [{
                storageId: new ObjectId(storageId)
            }, {
                itemId: new ObjectId(itemId)
            }, {
                _deleted: false
            }]
        };

        return new Promise((resolve, reject) => {
            this.collection
                .singleOrDefault(query)
                .then(inventory => {
                    if (inventory)
                        resolve(inventory);
                    else {
                        var newInventory = new Inventory({
                            storageId: new ObjectId(storageId),
                            itemId: new ObjectId(itemId)
                        });
                        this.create(newInventory)
                            .then(docId => {
                                this.getSingleById(docId)
                                    .then(inventory => {
                                        resolve(inventory);
                                    })
                                    .catch(e => {
                                        reject(e);
                                    });
                            })
                            .catch(e => {
                                reject(e);
                            });
                    }
                })
                .catch(e => {
                    reject(e);
                });
        })
    }

    outProduct(storageId, refNo, productId, quantity, remark) {
        var absQuantity = Math.abs(quantity);
        return this.moveProduct(storageId, refNo, 'OUT', productId, absQuantity * -1, remark);
    }

    out(storageId, refNo, itemId, quantity, remark) {
        var absQuantity = Math.abs(quantity);
        return this.move(storageId, refNo, 'OUT', itemId, absQuantity * -1, remark);
    }

    inProduct(storageId, refNo, productId, quantity, remark) {
        var absQuantity = Math.abs(quantity);
        return this.moveProduct(storageId, refNo, 'IN', productId, absQuantity, remark);
    }

    in(storageId, refNo, itemId, quantity, remark) {
        var absQuantity = Math.abs(quantity);
        return this.move(storageId, refNo, 'IN', itemId, absQuantity, remark);
    }

    moveProduct(storageId, refNo, type, productId, quantity, remark) {
        return new Promise((resolve, reject) => {
            this.getProductInventory(storageId, productId)
                .then(inventory => {
                    var originQuantity = inventory.quantity;
                    var movement = new InventoryMovement({
                        inventoryId: inventory._id,
                        data: new Date(),
                        reference: refNo,
                        type: type,
                        storageId: inventory.storageId,
                        productId: inventory.productId,
                        before: originQuantity,
                        quantity: quantity,
                        after: originQuantity + quantity,
                        remark: remark
                    });

                    inventory.quantity += quantity;

                    var updateInventory = this.update(inventory);
                    var createMovement = this.inventoryMovementManager.create(movement);

                    Promise.all([createMovement, updateInventory])
                        .then(results => {
                            var movementId = results[0];
                            var inventoryId = results[1];

                            resolve(movementId);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    move(storageId, refNo, type, itemId, quantity, remark) {
        return new Promise((resolve, reject) => {
            this.getInventory(storageId, itemId)
                .then(inventory => {
                    var originQuantity = inventory.quantity;
                    var movement = new InventoryMovement({
                        inventoryId: inventory._id,
                        data: new Date(),
                        reference: refNo,
                        type: type,
                        storageId: inventory.storageId,
                        itemId: inventory.itemId,
                        before: originQuantity,
                        quantity: quantity,
                        after: originQuantity + quantity,
                        remark: remark
                    });

                    inventory.quantity += quantity;

                    var updateInventory = this.update(inventory);
                    var createMovement = this.inventoryMovementManager.create(movement);

                    Promise.all([createMovement, updateInventory])
                        .then(results => {
                            var movementId = results[0];
                            var inventoryId = results[1];

                            resolve(movementId);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _validate(inventory) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = new Inventory(inventory);
            var getStorage = this.storageManager.getSingleById(inventory.storageId);
            var getItem;
            
            if (ObjectId.isValid(inventory.itemId)) {
                getItem = this.itemManager.getSingleById(inventory.itemId);
            } else if (ObjectId.isValid(inventory.productId)) {
                getItem = this.productManager.getSingleById(inventory.productId);
            }
            
            Promise.all([getStorage, getItem])
                .then(results => {
                    var storage = results[0];
                    var item = results[1];

                    if (!valid.storageId || valid.storageId == '')
                        errors["storageId"] = "storageId is required";
                    if (!storage) {
                        errors["storageId"] = "storageId not found";
                    }
                    else {
                        valid.storageId = storage._id;
                        valid.storage = storage;
                    }

                    if (ObjectId.isValid(valid.itemId)) {
                        if (!valid.itemId || valid.itemId == '')
                            errors["itemId"] = "itemId is required";
                        if (!item) {
                            errors["itemId"] = "itemId not found";
                        }
                        else {
                            valid.itemId = item._id;
                            valid.item = item;
                        }
                    } else {
                        if (!valid.productId || valid.productId == '')
                            errors["productId"] = "productId is required";
                        if (!item) {
                            errors["productId"] = "product not found";
                        }
                        else {
                            valid.productId = item._id;
                            valid.product = item;
                        }
                    }

                    if (valid.quantity == undefined || (valid.quantity && valid.quantity == '')) {
                        errors["quantity"] = "quantity is required";
                    }
                    else if (parseInt(valid.quantity) < 0) {
                        errors["quantity"] = "quantity must be greater than 0";
                    }

                    // 2c. begin: check if data has any error, reject if it has.
                    for (var prop in errors) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    if (!valid.stamp) {
                        valid = new Inventory(valid);
                    }

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid)
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getInventoryByItem(itemId) {
        return new Promise((resolve, reject) => {
            var query = {
                "itemId": (new ObjectId(itemId))
            }



            this.collection.find(query)
                .toArray().then(result =>
                    resolve(result));
        })
    }
    out(storageId, refNo, itemId, quantity, remark) {
        var absQuantity = Math.abs(quantity);
        return this.move(storageId, refNo, 'OUT', itemId, absQuantity * -1, remark);
    }

    in(storageId, refNo, itemId, quantity, remark) {
        var absQuantity = Math.abs(quantity);
        return this.move(storageId, refNo, 'IN', itemId, absQuantity, remark);
    }

    move(storageId, refNo, type, itemId, quantity, remark) {
        return new Promise((resolve, reject) => {
            this.getInventory(storageId, itemId)
                .then(inventory => {
                    var originQuantity = inventory.quantity;
                    var movement = new InventoryMovement({
                        inventoryId: inventory._id,
                        data: new Date(),
                        reference: refNo,
                        type: type,
                        storageId: inventory.storageId,
                        itemId: inventory.itemId,
                        before: originQuantity,
                        quantity: quantity,
                        after: originQuantity + quantity,
                        remark: remark
                    });

                    inventory.quantity += quantity;
                
                    if (inventory.storage.code == 'GDG.05' && inventory.quantity < 0) {
                        movement.before = (originQuantity - quantity)
                        movement.after = (movement.before + quantity)
                        inventory.quantity = 0
                    }
                     else {
                        movement.before = originQuantity
                     }

                    var updateInventory = this.update(inventory);
                    var createMovement = this.inventoryMovementManager.create(movement);

                    Promise.all([createMovement, updateInventory])
                        .then(results => {
                            var movementId = results[0];
                            var inventoryId = results[1];

                            resolve(movementId);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getInventoryByItem(itemId) {

        return new Promise((resolve, reject) => {
            var query = {}
            if (itemId && itemId !== "") {
                query = {
                    itemId: new ObjectId(itemId),
                    _deleted: false
                };
            }
            else {
                resolve(null)
            }
            this.collection.find(query)
                .toArray().then(result =>
                    resolve(result));

        });
    }
};
