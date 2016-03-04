import {QueryBuilder, ISqlSelect} from "./query_builder";
import {ISqlInsert} from "./query_builder";
import {IError} from "mysql";
import {ISqlUpdate} from "./query_builder";
import {ISqlDelete} from "./query_builder";

export interface IModelValidationRule {
    attrs: String[];
    validator: Function;
}

export class BaseModel {
    public static tableName: string;

    public attr: any;
    public oldAttr: any = {};

    public rules: IModelValidationRule[] = [];

    public tableName: string;
    public isNew: boolean = true;

    constructor(){
        this.tableName = this.constructor.tableName;
    }

    public static find(): ISqlSelect {
        // @todo return new self() to init new objects if not as array
        let builder: QueryBuilder = new QueryBuilder(this);
        return builder.select.from(this.tableName);
    }

    // @todo: I dont like "copyToOld" param
    public setAttributes(attributes: Object, copyToOld: boolean = false): void {
        for (let k in this.attr){
            if (this.attr.hasOwnProperty(k) && attributes.hasOwnProperty(k)){
                this.attr[k] = attributes[k];

                if (copyToOld){
                    this.oldAttr[k] = attributes[k];
                }
            }
        }
    }

    // @todo Validation
    public validate(): boolean {
        for (let k in this.attr){
            if (!this.attr.hasOwnProperty(k)){
                continue;
            }


        }
    }

    public save(callback: Function): void {
        if (!this.validate()){
            return callback(new Error());
        }

        if (this.isNew){
            this.insert(callback);
        } else {
            this.update(callback);
        }
    }

    public insert(callback: Function): void {
        let builder: QueryBuilder = new QueryBuilder();
        let command: ISqlInsert = builder.insert;

        command.into(this.tableName);

        for (let k in this.attr){
            if (!this.attr.hasOwnProperty(k)) {
                continue;
            }

            if (this.attr[k]){
                command.set(k, this.attr[k]);
            }
        }

        command.execute((err: IError, res: any) => {
            if (!err){
                this.attr.id = res.insertId;
            }

            // @todo: Should we set isNew of model to false?

            callback(err, (!err) ? this : undefined);
        });
    }

    public update(callback: Function): void {
        let builder: QueryBuilder = new QueryBuilder();
        let command: ISqlUpdate = builder.update;

        command.table(this.tableName).where("id=?", this.attr.id);

        let fieldsCount: number = 0;

        // @todo At the moment updating all values, we should have equivalent of "safe" in Yii
        for (let k in this.attr){
            // @todo: Not always will primary key be "id"
            if (!this.attr.hasOwnProperty(k) || k === "id") {
                continue;
            }

            if (this.attr[k] && this.attr[k] !== this.oldAttr[k]){
                fieldsCount++;
                command.set(k, this.attr[k]);
            }
        }

        if (fieldsCount > 0){
            command.execute((err: IError, res: any) => {
                // @todo: Should we set isNew of model to false?

                // Clone new attr to old
                this.cloneAttr();

                callback(err, (!err) ? this : undefined);
            });
        } else {
            // Nothing to update
            callback(undefined, this);
        }
    }

    public remove(callback: Function): void {
        let builder: QueryBuilder = new QueryBuilder();
        let command: ISqlDelete = builder.remove;

        command.from(this.tableName)
            .where("id=?", this.attr.id)
            .execute((err: IError, res: any) => {
                callback(err, (!err));
            });
    }

    // @todo: I dont like this here...
    private cloneAttr(): void {
        this.oldAttr = Object.keys(this.attr).reduce((obj: any, item: string) => {
            obj[item] = this.attr[item];
            return obj;
        },{});
    }
}
