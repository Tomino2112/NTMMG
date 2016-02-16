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
    process.exit(1);
}

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
        let output = "interface I"+parsedName+" {\r\n";

        for(let i=0;i<result.length;i++){
            output += "    "+result[i].Field+((result[i].Null === 'YES')?"?":"")+": "+getTSType(result[i].Type)+";\r\n";
        }

        output += "}\r\n";

        output += "\r\n";

        output += "class "+parsedName+" implements I"+parsedName+" { \r\n";

        // @todo Repetition
        for(let i=0;i<result.length;i++){
            output += "    "+result[i].Field+": "+getTSType(result[i].Type)+";\r\n";
        }

        output += "}\r\n";

        output += "\r\n";

        output += "export = "+parsedName+";\r\n";

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