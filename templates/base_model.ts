import {QueryBuilder, ISqlSelect} from "./query_builder";

export class BaseModel {
    public static tableName: string;

    public attr: any;
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
        for(let key in attributes){
            // @todo if I use hasOwnProperty it doesnt find it because by default they are empty and
            // @todo typescript doesnt compile empty properties
            if (this.attr.hasOwnProperty(key)){
                this.attr[key] = attributes[key];
            } else {
                console.log("Got value '" + key + "' from database but doesn't exist in model");
            }
        }
    }

    public validate(): boolean { return; }

    public save(callback: Function): void {
        if (this.isNew){
            this.insert();
        } else {
            this.update();
        }
    }

    public insert(): void {
        console.log(this.tableName);
    }

    public update(): void { return; }

    public remove(): void { return; }
}