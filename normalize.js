const csv = require('csv-parser');
const fs = require('fs');
const json2csvParser = require('json2csv').Parser;
const results = [];
const fields = ['Timestamp', 'Address', 'ZIP', 'FullName', 'FooDuration', 'BarDuration', 'TotalDuration', 'Notes']

if (process.argv.length <= 2) {
  console.log("USAGE: 'node normalize.js CSV_FILE_NAME.csv'");
  process.exit(-1);
}

fs.createReadStream(process.argv[2])
  .pipe(csv())
  .on('data', data => {
      results.push(data)
  })
  .on('end', () => {
    normalize(results);
    const json2csv = new json2csvParser({ fields });
    const csv = json2csv.parse(results);
    fs.writeFile('output.csv', csv, err => {
      if (err) throw err;
      console.log('Output file in output.csv');
    })
    // console.log(csv);
  });

normalize = results => {
  results.map(row => {
    checkUnicode(row)
    adjustTimestamp(row)
    checkZip(row)
    capitalize(row)
    convertDuration(row, 'FooDuration')
    convertDuration(row, 'BarDuration')
    calculateTotalDuration(row)
  })
}

checkUnicode = row => {
  Object.entries(row).map(([key, value]) => {
    row[key] = row[key].normalize('NFC')
    // var regex = /[^\x00-\u{10FFFF}]/g
    // row[key] = row[key].replace(regex, '\ufffd');
      // I'd need more time to figure out how to correctly replace 'invalid' Unicode characters
      // without doing something slow like spreading each string and checking character by character
      // if an operation throws an error. 
  });
}

adjustTimestamp = row => {
  let time = row.Timestamp;
  let d = new Date(row.Timestamp);
  if (time.split('-').length > 3) {
    // To determine if input contains Timezone information. 
    // This doesn't account for the cases where the user inputted 
    // a date in a form like "MM/DD/YYYY -Timezone" or "YYYY-MM-DD".
    d.setMinutes(d.getMinutes() - 240) 
  } else {
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 180)
  }
  row.Timestamp = d.toISOString().slice(0,-1) + "-07:00";
}

checkZip = row => {
  let len = row.ZIP.length;
  if (len < 5) {
    let zero = "0"
    row.ZIP = zero.repeat(5 - len) + row.ZIP;
  }
}

capitalize = row => {
  row.FullName = row.FullName.toUpperCase().normalize();
}

convertDuration = (row, column) => {
  let ts = row[column].split(':')
  ts = ts.concat(ts[2].split('.'))
  ts.splice(2,1)
  row[column] = (parseInt(ts[0])*3600 
               + parseInt(ts[1])*60 
               + parseInt(ts[2]) 
               + parseInt(ts[3])/1000).toString()
}

calculateTotalDuration = row => {
  row['TotalDuration'] = (parseFloat(row['FooDuration']) 
                        + parseFloat(row['BarDuration'])).toString()
}

