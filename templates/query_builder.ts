import * as squel from "squel";
import {IError} from "mysql";

/**
 * !!! NOTICE
 * ---------------------
 * Import your own db connection as a "db"
 *
 * example: import db from "./mysql"
 */

let db;

// Register handle for dates
squel.registerValueHandler(Date, (date: Date) => {
    return "'" + date.getFullYear() + "-" +
        (date.getMonth() + 1) + "-" +
        date.getDate() + " " +
        (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" +
        (date.getMinutes() < 10 ? "0" : "") + date.getMinutes() + ":" +
        (date.getSeconds() < 10 ? "0" : "") + date.getSeconds() + "'";
});

// Extending squel interfaces
export interface ISqlExecute {
    (callback: any): void;
}

export interface ISqlSelect extends SqlSelect {
    model: any;
    returnAsArray: boolean;

    execute: ISqlExecute;

    asArray(): ISqlSelect;
    exists(callback: (err: IError, res: boolean) => void): void;
    scalar(callback: (err: IError, res: any) => void): void;
    count(callback: (err: IError, res: number) => void): void;
    one(callback: (err: IError, res: any[]) => void): void;
    all(callback: (err: IError, res: any[]) => void): void;

    createSelectReturn(data: any): any;
}

export interface ISqlInsert extends SqlInsert {
    execute: ISqlExecute;
}

export interface ISqlUpdate extends SqlUpdate {
    execute: ISqlExecute;
}

export interface ISqlDelete extends SqlDelete {
    execute: ISqlExecute;
}

export class QueryBuilder {
    public select: ISqlSelect = squel.select();
    public insert: ISqlInsert = squel.insert();
    public update: ISqlUpdate = squel.update();
    public remove: ISqlDelete = squel.delete();

    constructor(model?: any){
        this.select.execute = this.insert.execute = this.update.execute = this.remove.execute = this.execute;

        this.select.asArray = this.asArray;
        this.select.exists = this.exists;
        this.select.scalar = this.scalar;
        this.select.count = this.count;
        this.select.one = this.one;
        this.select.all = this.all;
        this.select.createSelectReturn = this.createSelectReturn;

        if (model){
            this.select.model = model;
        }
    }

    public asArray(): ISqlSelect {
        this.returnAsArray = true;
        return this; // this refers to this.select
    }

    public execute(callback: (err: IError, res: any[]) => void): void {
        // @todo: make this NODE_ENV === development
        console.log("Running SQL query: " + this.toString());
        db.query(this.toString(), callback);
    }

    public all(callback: (err: IError, res: any[]) => void): void {
        this.execute((err: IError, res: any[]) => {
            callback(err, this.createSelectReturn(res) || undefined);
        });
    }

    public one(callback: (err: IError, res: any[]) => void): void {
        this.limit(1).execute((err: IError, res: any[]) => {
            let output: any = (res) ? this.createSelectReturn(res)[0] : undefined;
            callback(err, output);
        });
    }

    public count(callback: (err: IError, res: number) => void): void {
        this.asArray().execute((err: IError, res: any[]) => {
            callback(err, res.length || 0);
        });
    }

    public exists(callback: (err: IError, res: boolean) => any): void {
        this.asArray().one((err: IError, res: any[]) => {
            callback(err, (res) ? true : false);
        });
    }

    public scalar(callback: (err: IError, res: any) => void): void {
        this.asArray().one((err: IError, res: any) => {
            callback(err, (res) ? res[Object.keys(res)] : undefined);
        });
    }

    // @todo This logis should not be here, but has to be at the moment if we want to chain squel
    private createSelectReturn(data: any): any{
        // Check data and return if not ready for models
        if (!data || this.returnAsArray){
            return data;
        }

        if (!this.returnAsArray && !this.model){
            // @todo Should probably throw error
            console.log("Error: Should return results as models, but no model supplied");
            return data;
        }

        // Create models
        let models: any = [];

        for (let i: number = 0 ; i < data.length ; i++){
            let model: any = new this.model();
            model.setAttributes(data[i], true);
            model.isNew = false;

            models.push(model);
        }

        return models;
    }
}