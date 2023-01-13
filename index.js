const fs = require('fs')  

require('dotenv').config();
const _ = require('lodash');
const axios = require('axios');
const { DateTime } = require("luxon");
const converter = require('json-2-csv')

;(async () => {
    const [, , filePath ] = process.argv;

    const skus = fs.readFileSync(filePath, 'utf-8')
        .replace(/"/g, '')
        .split(/\r?\n/);

    let skusUniq = _.uniq(skus);
    skusUniq.shift();
    const skusChunks = _.chunk(skusUniq, 50); // Chunk array

    run(0);

    function run(i){
        if(skusChunks[i] && skusChunks.length > i){
            getData(skusChunks[i].join(), i);
        }
    }

    function getData(skuLists, i){
        const data = JSON.stringify({
            "api_key": process.env.API_KEY,
            "email": process.env.EMAIL,
            "signature": process.env.SIGNATURE,
            "product_skus": skuLists
        });
        
        const config = {
            method: 'get',
            url: 'https://ewms.anchanto.com/fetch_stock',
            headers: { 
            'Content-Type': 'application/json', 
            'Cookie': '_order_management_session=BAh7BkkiD3Nlc3Npb25faWQGOgZFVEkiJTRhNzFkNjcyN2MwZmI4MjU5ZmY5MWY5ODczMjJlMzY3BjsAVA%3D%3D--b30d3a3d568bf89ff10400b21e55acb7f076eb7c; locale=en'
            },
            data : data
        };
        axios(config)
        .then(function(response) {
            const results = [];
            const products = response?.data?.products;

            for(let j = 0; products.length > j; j++){
                let val = products[j];

                results.push({
                    company_name: "",
                    product_sku: val.sku,
                    location: "",
                    item_type: val.item_type,
                    qty: val.item_type === 'not_in_fba' ? 'NA' : val.quantity
                });

                console.log(`Saving ${val.sku} ...`)
            }

            groupedAndRemoveDuplicates(results,i);
        })
        .catch(function (error) {
            console.log(error);
        });
    }

    // Grouped data from SKUs and remove the duplicates. Only get the active SKUs
    function groupedAndRemoveDuplicates(results, i){
        const groupedResults = _(results)
            .groupBy(x => x.product_sku.toUpperCase())
            .map((value, key) => ({product_sku: key, data: value}))
            .value();

        let skusDataArr = [];
        groupedResults.forEach((val) => {
            val.data.forEach((val2) => {
                if(val.data.length > 1){
                    if(val2.item_type != 'not_in_fba'){
                        skusDataArr.push({
                            "Company Name": "",
                            "Product SKU": val2.product_sku,
                            "Location": "",
                            "Qty": val2.qty
                        })
                    }
                } else {
                    skusDataArr.push({
                        "Company Name": "",
                        "Product SKU": val2.product_sku,
                        "Location": "",
                        "Qty": val2.qty
                    })
                }
            })
        }) 

        convertToCsv(skusDataArr, i);
    }

    // Convert JSON to CSV
    function convertToCsv(skusDataArr, i){
        converter
        .json2csvAsync(skusDataArr)
        .then(csv => {
            // write CSV to a file
            const date = DateTime.now().toFormat('yyyyMMdd')
            if(i <= 1){
                fs.writeFileSync(`${date}-${filePath}`, csv) // with header
            } else {
                fs.appendFileSync(`${date}-${filePath}`, '\n' + csv.split('\n').slice(1).join('\n'))
            }
        })
        .catch(err => console.log(err))
    
        i++;
        run(i)
    }
})();
