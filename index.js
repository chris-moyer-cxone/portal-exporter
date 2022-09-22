// ==UserScript==
// @name         Portal: Export All Client Sites' Details
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Filter and export all sites' details for further processing.
// @author       Chris Moyer
// @match        https://portal2.mindtouch.us/sites*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

/**
 * Usage
 * 
 * Install the Tampermonkey extension in a Chrome browser
 * https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en
 * Navigate to the Tampermonkey dashboard
 * In the top right, click the + button to create a new file
 * Copy the contents of this file into your newly created file
 * Save
 * 
 * Open Portal
 * Refresh the Portal page and you should see a new button near the top left of the page labelled: "Results to CSV"
 * Click this button and wait for the resulting activity to stop
 * You should see a csv file automatically download
 * That csv file will contain all the rows that were available in Portal, based on your filter criteria.
 */


/**
 * TODO
 */

 const limit = 500;
 const testSelector = 'table.sites-table tbody > tr';
 const resultsTableBodySelector = 'table.sites-table tbody';
 const loadingSpinnerSelector = 'div.spinner-container';
 
 let siteDataSet = [];
 let offset = 0;
 
 class Column{
     constructor(selector, label){
         this.selector = selector;
         this.label = label;
         this.number = 0;
     }
 }
 
 const columns = [
     new Column('input[name="siteId"]', 'Site Id'),
     new Column('body > main > div > div.site-list-dynamic-columns > div.site-list-default-columns > div:nth-child(2) > input', 'Canonical Host'),
     new Column('input[name="status"]', 'Status'),
     new Column('input[name="salesForceCustomerId"]', 'Salesforce Customer Id'),
     new Column('input[name="alternateSalesForceCustomerId"]', 'Alternate Salesforce Customer Id'),
     new Column('input[name="expires"]', 'Expires'),
     new Column('input[name="created"]', 'Created'),
     new Column('input[name="description"]','Description'),
     new Column('body > main > div > div.site-list-dynamic-columns > div.site-list-default-columns > div:nth-child(6) > input','Version')
 ]
 
 class SiteData{
     constructor( id, host='',status='', sfid='', asfid='', expires='', created='', description='', version='' ){
         this.siteId = id;
         this.host = host;
         this.status = status;
         this.salesForceCustomerId = sfid;
         this.alternateSalesForceCustomerId = asfid
         this.expires = expires;
         this.created = created;
         this.description = description;
         this.version = version
     }
 
     toCSV(){
         let result = "";
         for(const key in this){
             result += `${this[key]}`.trim() + ',';
         }
 
         return result.slice(0, -1);
     }
 
     // toJSON(columns={}){
     //     /**
     //      * Exports internal data to a JSON format
     //      */
     // }
 }
 
 //#region Actions and Analyzers
 
 async function getColNum(colName){
     while(!document.querySelector("body > main > div > div:nth-child(5) > form > div > div > div:nth-child(1) > div.select > div > select")){
         await sleep(200);
     }
 
     let cnt = 0;
     const headerRow = document.querySelector('table.sites-table thead tr')
     for(const col of headerRow.children){
         // Get each column's header
         if(colName == col.textContent) return cnt;
         cnt++;
     }
     return -1; // Case: no match found
 }
 
 async function clickFilterBtn(){
     const filterBtn = document.querySelector('div.sites-list-container form button[type="submit"]')
     filterBtn.click();
     await sleep(200); // wait a tick after pressing the button to allow elements to be unloaded
 }
 
 function dispatchEvent(el, eventName){
     /** Used to apply value updates to certain form fields. Portal doesn't
      * adhere to standard form update lifecycles, and relies on event handlers
      * triggering updates to an unknown JS Object.
      */
     const e = document.createEvent("HTMLEvents");
     e.initEvent(eventName);
     el.dispatchEvent(e);
 }
 
 async function scrapePage(selector){
     console.log("Collecting Site Data...");
     let results = []
     await waitForVisibleElement(`${selector} tr td`, 10) //less than standard retries since element should already exist
     await sleep(200)
     let tbody = document.querySelector(selector)
     if(!tbody.childElementCount) return null;
     const rows = tbody.children
     for(const row of rows){
         let result = new SiteData(
             row.children[columns[0].number].textContent,
             row.children[columns[1].number].textContent,
             row.children[columns[2].number].textContent,
             row.children[columns[3].number].textContent,
             row.children[columns[4].number].textContent,
             row.children[columns[5].number].textContent,
             row.children[columns[6].number].textContent,
             row.children[columns[7].number].textContent.replaceAll(',',' '),
             row.children[columns[8].number].textContent,
         )
         results.push(result)
     }
     return results
 }
 
 //#endregion Actions and Analyzers
 
 //#region Configuration and Page Prep
 
 function setElVisible(column) {
     /**
      * Not used currently
      */
     const toggle = document.querySelector(column.selector);
     if (!toggle.checked) toggle.click();
 }
 
 async function setColumnVisible(column) {
     await waitForVisibleElement(column.selector)
     const toggle = document.querySelector(column.selector);
     if (!toggle.checked) toggle.click();
 }
 
 async function setLimit(limit=500){
     await waitForVisibleElement("body > main > div > div:nth-child(5) > form > div > div > div:nth-child(1) > div.select > div > select")
     let limitSelector = document.querySelector("body > main > div > div:nth-child(5) > form > div > div > div:nth-child(1) > div.select > div > select");
     limitSelector.value = limit;
     dispatchEvent(limitSelector, 'input')
 }
 
 async function setOffset(offset){
     await waitForVisibleElement('input[placeholder="Offset"]')
     let offsetTextField = document.querySelector('input[placeholder="Offset"]');
     offsetTextField.value = offset;
     dispatchEvent(offsetTextField, 'input')
 }
 
 async function setStatus(status='ActiveAll'){
     await waitForVisibleElement('input[placeholder="Offset"]')
     const statusSelector = document.querySelector("body > main > div > div:nth-child(5) > form > div > div > div:nth-child(2) > div:nth-child(2) > div > select");
     statusSelector.value = status;
     dispatchEvent(statusSelector, 'input')
 }
 
 //#endregion Configuration and Page Prep
 
 //#region Add Markup
 
 function createButton(siblingEl, text, clickFn){
     let btnEl = document.createElement('button');
     btnEl.textContent = text;
     btnEl.addEventListener('click', clickFn);
     siblingEl.after(btnEl);
     return btnEl;
 }
 
 function downloadCSV(text){
     let hiddenEl = document.createElement('a');
     hiddenEl.href = 'data:text/csv;charset=utf-8,' + encodeURI(text);
     hiddenEl.target = '_blank';
     hiddenEl.download = `customerSiteIDs_${getDateStamp()}.csv`
     hiddenEl.click();
 }
 
 //#endregion Add Markup
 
 
 //#region Helpers
 
 async function sleep(millis){
     return new Promise(resolve=>setTimeout(resolve, millis));
 }
 
 async function waitForVisibleElement(selector, retryLimit=80){
     let cnt = 0
     while(!document.querySelector(selector) && cnt < retryLimit){
         await sleep(100);
         cnt++;
     }
 }
 
 function getDateStamp(){
     let today = new Date();
     let dd = String(today.getDate()).padStart(2, '0');
     let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
     let yyyy = today.getFullYear();
     return `${mm}/${dd}/${yyyy}`
 }
 
 //#endregion Helpers
 
 async function preparePage(){
     await waitForVisibleElement(resultsTableBodySelector)
 
     const filterForm = document.querySelector("body > main > div > div:nth-child(5) > form")
     if(filterForm.childElementCount == 0){
         const filterToggle = document.querySelector("body > main > div > div:nth-child(5) > label")
         filterToggle.click()
     }
     const dynamicColsForm = document.querySelector('div.site-list-dynamic-columns');
     if(!dynamicColsForm){
         const columnLabel = document.querySelector("body > main > div > label")
         columnLabel.click()
     }
 
     // columns.map with async lambda funcs returns an array of promises
     // Promise.all handles that array and allows sequential execution
     await Promise.all(columns.map(async (col)=> { await setColumnVisible(col); }) );
     await Promise.all(columns.map(async (col)=> { col.number = await getColNum(col.label); }) );
     await setLimit(limit);
     await setStatus();
 
     await clickFilterBtn();
 
 }
 
 async function getAllResults(){
 
     let results = null;
     results = await scrapePage(resultsTableBodySelector);
     while(results){
         // await sleep(200);
         offset += limit;
         await setOffset(offset);
         siteDataSet.push(...results); //Append all results to overall dataset
         await clickFilterBtn();
         results = await scrapePage(resultsTableBodySelector);
     }
 
     let csvOutput = '';
     for(const key in siteDataSet[0]){
         csvOutput += `${key},`
     }
     csvOutput = csvOutput.slice(0, -1);
     csvOutput += '\n'
     console.log(csvOutput)
     const re = /^[Oo]ther/;
     siteDataSet.forEach( row =>{
         if( re.exec(row.description) ){
             csvOutput += row.toCSV() + '\n'
         };
     });
     csvOutput = csvOutput.slice(0, -1);
 
     downloadCSV(csvOutput);
 }
 
 
 async function main(){
     await preparePage();
 
     // await waitForVisibleElement('a[href="/sites/create"]');
     const btnParent = document.querySelector('a[href="/sites/create"]');
     createButton(btnParent, 'Results to CSV', getAllResults)
 };
 
 window.addEventListener('load', main(), false)
 