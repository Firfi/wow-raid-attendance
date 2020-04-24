const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const uniqBy = require('lodash/uniqBy');
const flatMap = require('lodash/flatMap');
const fromPairs = require('lodash/fromPairs');
const find = require('lodash/find');

const publicKey = fs.readFileSync('pkey', 'utf8').split(',');
const logIds = fs.readFileSync('log-ids', 'utf8').split(',');

const requests = logIds.map(id => {
    return axios.get(`https://www.warcraftlogs.com:443/v1/report/fights/${id}?api_key=${publicKey}`)
        .then(function (response) {
            return {id, data: response.data};
        })
        .catch(function (error) {
            console.log(error);
        });
});

Promise.all(requests).then(responses => {
    const csvWriter = createCsvWriter({
        path: 'attendance.csv',
        header: [{id: 'name', title: 'name'}, {id: 'class', title: 'class'}, ...responses.map(({id, data}) => ({id: id, title: `${id}`}))]
    });
    const characters = uniqBy(flatMap(responses, ({data}) => data.friendlies), 'guid');
    const tableData = characters.map(c => ({name: c.name, 'class': c.type, ...fromPairs(responses.map(({id, data}) => {
        const maxAttendance = Math.max(...data.friendlies.map(f => f.fights.length));
        const onePercent = maxAttendance / 100;
        const charInFights = find(data.friendlies, f => f.guid === c.guid);
        return [id, Math.round((charInFights && charInFights.fights.length || 0) / onePercent)];
    }))}));
    csvWriter
        .writeRecords(tableData)
        .then(() => console.log('The CSV file was written successfully'));
});



