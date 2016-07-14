'use strict';

// external deps 
var ObjectId = require('mongodb').ObjectId;

// internal deps
require('mongodb-toolkit');
var BateeqModels = require('bateeq-models');
var map = BateeqModels.map;

var ArticleApproval = BateeqModels.article.ArticleApproval;
var ArticleBrand = BateeqModels.article.ArticleBrand;
var ArticleCategory = BateeqModels.article.ArticleCategory;
var ArticleColor = BateeqModels.article.ArticleColor;
var ArticleCostCalculationDetail = BateeqModels.article.ArticleCostCalculationDetail;
var ArticleCostCalculation = BateeqModels.article.ArticleCostCalculation;
var ArticleCounter = BateeqModels.article.ArticleCounter;
var ArticleMaterial = BateeqModels.article.ArticleMaterial;
var ArticleMotif = BateeqModels.article.ArticleMotif;
var ArticleOrigin = BateeqModels.article.ArticleOrigin;
var ArticleSeason = BateeqModels.article.ArticleSeason;
var ArticleSize = BateeqModels.article.ArticleSize;
var ArticleSubCounter = BateeqModels.article.ArticleSubCounter;
var ArticleTheme = BateeqModels.article.ArticleTheme;
var ArticleType = BateeqModels.article.ArticleType;
var ArticleVariant = BateeqModels.article.ArticleVariant;
var Article = BateeqModels.article.Article;

module.exports = class ArticleThemeManager{
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.articleThemeCollection = this.db.use(map.article.ArticleTheme);
    }

    read(paging) {
        var _paging = Object.assign({
            page: 1,
            size: 20,
            order: '_id',
            asc: true
        }, paging);
        
        return new Promise((resolve, reject) => {
            var deleted = {
                _deleted: false
            };
            var query = _paging.keyword ? {
                '$and': [deleted]
            } : {
                _deleted: deleted
            };

            if (_paging.keyword) {
                var regex = new RegExp(_paging.keyword, "i");
                var filterCode = {'code':{'$regex': regex}};
                var filterName = {'name':{'$regex': regex}};
                var $or = {'$or':[filterCode, filterName]};
                
                query['$and'].push($or);
            }


            this.articleThemeCollection
                .where(query)
                .page(_paging.page, _paging.size)
                .orderBy(_paging.order, _paging.asc)
                .execute()
                .then(articleThemes => {
                    resolve(articleThemes);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }  

    getById(id) {
        return new Promise((resolve, reject) => {
            var query = {
                _id: new ObjectId(id)
            };
            this.getSingleByQuery(query)
                .then(articleStyle => {
                    resolve(articleStyle);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getSingleByQuery(query) {
        return new Promise((resolve, reject) => {
            this.articleThemeCollection
                .single(query)
                .then(articleStyle => {
                    resolve(articleStyle);
                })
                .catch(e => {
                    reject(e);
                });
        })
    } 

    create(articleStyle) {
        return new Promise((resolve, reject) => {
            this._validate(articleStyle)
                .then(validArticleTheme => {

                    this.articleThemeCollection.insert(validArticleTheme)
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

    update(articleStyle) {
        return new Promise((resolve, reject) => {
            this._validate(articleStyle)
                .then(validArticleTheme => {
                    this.articleThemeCollection.update(validArticleTheme)
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

    delete(articleStyle) {
        return new Promise((resolve, reject) => {
            this._validate(articleStyle)
                .then(validArticleTheme => {
                    validArticleTheme._deleted = true;
                    this.articleThemeCollection.update(validArticleTheme)
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


    _validate(articleStyle) {
        return new Promise((resolve, reject) => {
            var valid = new ArticleTheme(articleStyle);
            valid.stamp(this.user.username,'manager');
            resolve(valid);  
        });
    }
};