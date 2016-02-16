import * as program from "commander";

import * as mysql from "mysql";
import * as squel from "squel";

import * as fs from "fs";

import {IConnection} from "mysql";

// Create program definition
program
    .version('0.0.1')
    .option('-c, --config [path]', 'Path to config file, defaults to ./config.json')
    .option('-a, --all', 'All tables')
    .option('-t, --tables <tables>', 'List of tables to be processed <table1, table2 ...>')
    .option('-o, --output [path]', 'Output path - include trailing slash!, defaults to ./models/')
    .parse(process.argv);

if (!program.config)
    program.config = './config.json';

if (!program.output)
    program.output = './models/';

// Load config
const config = require(program.config);

// Create mysql connection
let connection: IConnection = mysql.createConnection({
    database : config.database,
    host     : config.host,
    password : config.password,
    user     : config.user,
});

// Nothing to process
if (!program.tables && !program.all){
    console.log("You must specify either tables to process or -a flag to process all");
    process.exit(1);
}

// Generate base model
generateBaseModel();

// Process tables
if (program.all) {
    // Get list of tables
    let query = squel
        .select()
        .field('table_name')
        .from('information_schema.tables')
        .where('table_schema=?',config.database)
        .toString();

    connection.query(query, (err, result) => {
        if (err){
            console.log('Error getting tables');
            process.exit(1);
        }

        let tables = [];

        for(let i=0;i<result.length;i++){
            tables.push(result[i].table_name);
        }

        generateModels(tables);
    });
} else {
    generateModels(program.tables.split(','));
}

function generateModels(tables){
    for(let i=0;i<tables.length;i++){
        generateModel(tables[i]);
    }
}

function generateModel(tableName){
    // Get table detail
    connection.query('DESC '+tableName, (err, result) => {
        if (err){
            console.log('Error getting structure of table '+tableName);
        }

        let parsedName = parseTableName(tableName);

        let output = "";

        output += "import BaseModel from \"./db_model\";\r\n";

        output += "\r\n";

        output += "export interface I"+parsedName+" {\r\n";

        for(let i=0;i<result.length;i++){
            output += "    "+result[i].Field+((result[i].Null === 'YES')?"?":"")+": "+getTSType(result[i].Type)+";\r\n";
        }

        output += "}\r\n";

        output += "\r\n";

        output += "class "+parsedName+" extends BaseModel implements I"+parsedName+" { \r\n";

        output += "    public static tableName: string = \"" + tableName+"\";\r\n\r\n";

        // @todo Repetition
        for(let i=0;i<result.length;i++){
            output += "    public "+result[i].Field+": "+getTSType(result[i].Type)+";\r\n";
        }

        output += "}\r\n";

        output += "\r\n";

        output += "export default "+parsedName+";\r\n";

        fs.writeFile(program.output+tableName+'.ts',output,(err) => {
            if (err) throw err;

            console.log('Model for table '+tableName+' generated!');
        });
    });
}

function getTSType(type){
    const numbers = ['int', 'decimal', 'bigint', 'serial', 'bit', 'tinyint', 'smallint', 'mediumint', 'integer', 'dec', 'float', 'double'];
    const strings = ['char', 'varchar', 'text', 'enum', 'binary', 'varbinary', 'tinyblob', 'tinytext', 'blob', 'mediumblob', 'mediumtext', 'longblog', 'longtext', 'set'];
    const booleans = ['boolean'];

    if (checkISType(type, numbers)) return 'number';
    if (checkISType(type, strings)) return 'string';
    if (checkISType(type, booleans)) return 'boolean';

    return 'any';
}

function checkISType(type, pool){
    let found = false;

    for(let i=0;i<pool.length;i++){
        if (type.indexOf(pool[i]) >=0){
            found = true;
            break;
        }
    }

    return found;
}

function parseTableName(tableName){
    let parts = tableName.split('_');
    for(let i=0;i<parts.length;i++){
        parts[i] = parts[i].charAt(0).toUpperCase()+parts[i].slice(1);
    }

    return parts.join('');
}

function generateBaseModel(){
    let output = "";

    output += "import * as mysql from \"mysql\";\r\n";
    output += "import * as squel from \"squel\";\r\n";

    output += "\r\n";

    output += "const db = mysql.createConnection({\r\n";
    output += "    \"database\" : \""+config.database+"\",\r\n";
    output += "    \"host\"     : \""+config.host+"\",\r\n";
    output += "    \"password\" : \""+config.password+"\",\r\n";
    output += "    \"user\"     : \""+config.user+"\"\r\n";
    output += "});\r\n";

    output += "\r\n";

    output += "class QueryBuilder {\r\n";
    output += "    select = squel.select();\r\n";
    output += "    insert = squel.insert();\r\n";
    output += "    update = squel.update();\r\n";
    output += "    remove = squel.delete();\r\n";
    output += "\r\n";
    output += "    constructor(){\r\n";
    output += "        this.select.execute = this.insert.execute = this.update.execute = this.remove.execute = this.execute;\r\n";
    output += "\r\n";
    output += "        this.select.exists = this.exists;\r\n";
    output += "        this.select.scalar = this.scalar;\r\n";
    output += "        this.select.count = this.count;\r\n";
    output += "        this.select.one = this.one;\r\n";
    output += "        this.select.all = this.execute;\r\n";
    output += "    }\r\n";
    output += "\r\n";
    output += "    private execute(callback){\r\n";
    output += "        //console.log(this.toString());\r\n";
    output += "        db.query(this.toString(), callback);\r\n";
    output += "    }\r\n";
    output += "\r\n";
    output += "    private one(callback){\r\n";
    output += "        this.limit(1).execute((err, res) => {\r\n";
    output += "            callback(err, res[0] || undefined);\r\n";
    output += "        });\r\n";
    output += "    }\r\n";
    output += "\r\n";
    output += "    private count(callback){\r\n";
    output += "        this.execute((err, res) => {\r\n";
    output += "            callback(err, res.length || 0);\r\n";
    output += "        });\r\n";
    output += "    }\r\n";
    output += "\r\n";
    output += "    private exists(callback){\r\n";
    output += "        this.one((err, res) => {\r\n";
    output += "            callback(err, (res && res.length)?true:false);\r\n";
    output += "        });\r\n";
    output += "    }\r\n";
    output += "\r\n";
    output += "    private scalar(callback){\r\n";
    output += "        this.one((err, res) => {\r\n";
    output += "            callback(err, (res) ? res[Object.keys(res)[0]] : undefined);\r\n";
    output += "        });\r\n";
    output += "    }\r\n";
    output += "}\r\n";

    output += "\r\n";

    output += "class BaseModel {\r\n";
    output += "    public static tableName: string;\r\n";
    output += "\r\n";
    output += "    public static find(){\r\n";
    output += "        var builder = new QueryBuilder();\r\n";
    output += "        return builder.select.from(this.tableName);\r\n";
    output += "    }\r\n";
    output += "\r\n";
    output += "    public save(){}\r\n";
    output += "    public update(){}\r\n";
    output += "    public remove(){} // @todo: because cannot use delete\r\n";
    output += "}\r\n";

    output += "\r\n";

    output += "export default BaseModel;\r\n";

    // @todo: could be name collision - config
    fs.writeFile(program.output+'db_model.ts',output,(err) => {
        if (err) throw err;

        console.log('Base model generated!');
    });
}