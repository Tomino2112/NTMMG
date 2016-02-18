import {QueryBuilder, ISqlSelect} from "./query_builder";

export class BaseModel {
    public static tableName: string;

    public static find(): ISqlSelect {
        let builder: QueryBuilder = new QueryBuilder();
        return builder.select.from(this.tableName);
    }

    public static save(): void { return; }
    public static update(): void { return; }
    public static remove(): void { return; }
}
