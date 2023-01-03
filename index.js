require('dotenv').config();

const fs = require('fs')  
var request = require('request');
const csv = require('csv-parser');
const converter = require('json-2-csv')

/**
 * Read data (list of SKUs based on the given command line params)
 * 
 * @return null
 */
var filePath = process.argv.slice(2)[0];

var skus = [];
fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (data) => skus.push(data.SKU))
  .on('end', () => {
    // call function
    getDataAndConvertToCsv(skus.join());
  }); 

/**
 * Get data based on the lists on SKU
 * 
 * @param { } skus 
 * @return null
 */
function getDataAndConvertToCsv(skus){
    var options = {
        'method': 'GET',
        'url': 'https://ewms.anchanto.com/fetch_stock',
        'headers': {
            'Content-Type': 'application/json',
            'Cookie': '_order_management_session=BAh7BkkiD3Nlc3Npb25faWQGOgZFVEkiJTBiODRiYWJiZTliOGM5ZjcwNTBmODA3NTMxM2Y5NGRhBjsAVA%3D%3D--ed0fa574134525b421d77bf16e0b220e21d8e729; locale=en'
        },
        body: JSON.stringify({
            "api_key": process.env.API_KEY,
            "email": process.env.EMAIL,
            "signature": process.env.SIGNATURE,
            "product_skus": skus
        })
    };
    request(options, function (error, response) {
        if (error) throw new Error(error);
    
        let results = JSON.parse(response.body);
        let skus = [];
     
        results.products.forEach((val) => {
            skus.push({
                "Company Name": '',
                "Product SKU": val.sku,
                "Location": '',
                "Qty": val.quantity
            });
            console.log(val)
        });
    
        converter
            .json2csvAsync(skus)
            .then(csv => {
                // write CSV to a file
                let date = new Date().toISOString().slice(0, 10);
                fs.writeFileSync(date.replace(/-/g,"") + '-' + filePath, csv)
            })
            .catch(err => console.log(err))
    });
}
