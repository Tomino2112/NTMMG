import {QueryBuilder, ISqlSelect} from "./query_builder";
import {BadRequestHttpError} from "../../components/http_errors";
import {ISqlInsert} from "./query_builder";
import {IError} from "mysql";
import {ISqlUpdate} from "./query_builder";

export class BaseModel {
    public static tableName: string;

    public attr: any;
    public oldAttr: any = {};

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

    public setAttributes(attributes: Object): void {
        for (let k in this.attr){
            if (this.attr.hasOwnProperty(k)){
                this.attr[k] = attributes[k];
                this.oldAttr[k] = attributes[k];
            }
        }
    }

    // @todo Validation
    public validate(): boolean { return true; }

    public save(callback: Function): void {
        if (!this.validate()){
            return callback(new BadRequestHttpError());
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

        command.table(this.tableName)
            .where("id=?", this.attr.id);

        // @todo At the moment updating all values, we should probably have some whitelist
        for (let k in this.attr){
            // @todo: Not always will primary key be "id"
            if (!this.attr.hasOwnProperty(k) || k === "id") {
                continue;
            }

            if (this.attr[k] && this.attr[k] !== this.oldAttr[k]){
                command.set(k, this.attr[k]);
            }
        }

        command.execute((err: IError, res: any) => {
            // @todo: Should we set isNew of model to false?

            callback(err, (!err) ? this : undefined);
        });
    }

    public remove(): void { return; }
}
