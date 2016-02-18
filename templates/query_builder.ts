import * as squel from "squel";
import {IError} from "mysql";

/**
 * !!! NOTICE
 * ---------------------
 * Import your own db connection as a "db"
 *
 * example: import db from "./mysql"
 */

let db = undefined;

// Extending squel interfaces
export interface ISqlExecute {
    (callback: any): void;
}

export interface ISqlSelect extends SqlSelect {
    execute: ISqlExecute;

    exists(callback: (err: IError, res: boolean) => void): void;
    scalar(callback: (err: IError, res: any) => void): void;
    count(callback: (err: IError, res: number) => void): void;
    one(callback: (err: IError, res: any[]) => void): void;
    all(callback: (err: IError, res: any[]) => void): void;
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
    private select: ISqlSelect = squel.select();
    private insert: ISqlInsert = squel.insert();
    private update: ISqlUpdate = squel.update();
    private remove: ISqlDelete = squel.delete();

    constructor(){
        this.select.execute = this.insert.execute = this.update.execute = this.remove.execute = this.execute;

        this.select.exists = this.exists;
        this.select.scalar = this.scalar;
        this.select.count = this.count;
        this.select.one = this.one;
        this.select.all = this.execute;
    }

    private execute(callback: (err: IError, res: any[]) => void): void{
        // @todo: make this NODE_ENV === development
        console.log("Running SQL query: " + this.toString());
        db.query(this.toString(), callback);
    }

    private one(callback: (err: IError, res: any[]) => void): void {
        this.limit(1).execute((err: IError, res: any[]) => {
            callback(err, res[0] || undefined);
        });
    }

    private count(callback: (err: IError, res: number) => void): void {
        this.execute((err: IError, res: any[]) => {
            callback(err, res.length || 0);
        });
    }

    private exists(callback: (err: IError, res: boolean) => any): void {
        this.one((err: IError, res: any[]) => {
            callback(err, (res && res.length) ? true : false);
        });
    }

    private scalar(callback: (err: IError, res: any) => void): void {
        this.one((err: IError, res: any[]) => {
            callback(err, (res) ? res[Object.keys(res)[0]] : undefined);
        });
    }
}