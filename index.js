require('dotenv').config();

var _ = require('lodash');
const fs = require('fs')  
var axios = require('axios');
const csv = require('csv-parser');
const converter = require('json-2-csv')

;(async () => {

    // Read list of SKUs params in the CSV file
    var filePath = process.argv.slice(2)[0];

    let skus = fs.readFileSync(filePath, 'utf-8');
    skus = skus.replace(/"/g, '');
    skus = skus.split(/\r?\n/);
    skus.shift();
    skus = _.uniq(skus);
    let skusChunks = _.chunk(skus, 5000); // Chunk array

    run(0);

    async function run(i){
        if(skusChunks[i] && skusChunks.length >= i){
            await getData(skusChunks[i].join(), i);
        }
    }

    async function getData(skuLists, i){
        var data = JSON.stringify({
            "api_key": process.env.API_KEY,
            "email": process.env.EMAIL,
            "signature": process.env.SIGNATURE,
            "product_skus": skuLists
        });
        
        var config = {
            method: 'get',
            url: 'https://ewms.anchanto.com/fetch_stock',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': '_order_management_session=BAh7BkkiD3Nlc3Npb25faWQGOgZFVEkiJTRhNzFkNjcyN2MwZmI4MjU5ZmY5MWY5ODczMjJlMzY3BjsAVA%3D%3D--b30d3a3d568bf89ff10400b21e55acb7f076eb7c; locale=en'
            },
            data : data
        };
        axios(config)
        .then(async function (response) {
            let results = [];
            response.data.products.forEach( (val) => {

                console.log(val.sku)
                 results.push({
                    "Company Name": "",
                    "Product SKU": val.sku,
                    "Location": "",
                    "Qty": val.item_type == 'not_in_fba' ? 'NA': val.quantity
                });
            })

            console.log('Saving to file...');

            converter
            .json2csvAsync(results)
            .then(csv => {
                // write CSV to a file
                let date = new Date().toISOString().slice(0, 10);
                if(i <= 1){
                    fs.appendFileSync(date.replace(/-/g,"") + '-' + filePath, csv) // swith header
                } else {
                    fs.appendFileSync(date.replace(/-/g,"") + '-' + filePath, '\n' + csv.split('\n').slice(1).join('\n'))
                }
            })
            .catch(err => console.log(err))

            i++;
            run(i)
        })
        .catch(function (error) {
            console.log(error);
        });
       
    }
})();
