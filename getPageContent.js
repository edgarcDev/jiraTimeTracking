var xhr = new XMLHttpRequest();

function DOMtoString(document_root) {
    var domParser = new DOMParser();
    var issuekeyTds = document_root.getElementsByClassName('issuekey');
    var issueItems = [];
    for (let item of issuekeyTds) {

        var _item = {
            key: item.firstElementChild.text
        }

        //http://jira.104.com.tw/activity?streams=issue-key+IS+{key}
        xhr.open("GET", 'http://jira.104.com.tw/activity?maxResults=99&streams=issue-key+IS+' + _item.key, false);
        xhr.send();

        var _activity;
        if (xhr.readyState === xhr.DONE) {
            if (xhr.status === 200) {
                _activity = domParser.parseFromString(xhr.responseText, "text/xml");

                var entrys = _activity.getElementsByTagName('entry');

                var waitTime = 0, techTime = 0, labTestTime = 0, stgTestTime = 0, waitOLTime = 0;
                for (var i = entrys.length - 1; i >= 0; i--) {

                    //開單後被認領開工
                    if (entrys[i].querySelector('category[term="created"]')) {
                        for (var j = i; j >= 0; j--) {
                            if (entrys[j].querySelector('category[term="InProgress"]')) {
                                waitTime += new Date(entrys[j].querySelector('updated').innerHTML).getTime() - new Date(entrys[i].querySelector('updated').innerHTML).getTime();
                                break;
                            }
                        }
                        continue;
                    }

                    //開工後上到lab測試
                    if (entrys[i].querySelector('category[term="InProgress"]')) {
                        for (var j = i; j >= 0; j--) {
                            if (entrys[j].querySelector('category[term="Lab測試1"]')) {
                                techTime += new Date(entrys[j].querySelector('updated').innerHTML).getTime() - new Date(entrys[i].querySelector('updated').innerHTML).getTime();
                                break;
                            }
                        }
                        continue;
                    }

                    //lab測試被退回
                    var isFindLabNext = false;
                    if (entrys[i].querySelector('category[term="Lab測試1"]')) {
                        for (var j = i; j >= 0; j--) {
                            if (entrys[j].querySelector('category[term="重新開發/修正"]')) {
                                labTestTime += new Date(entrys[j].querySelector('updated').innerHTML).getTime() - new Date(entrys[i].querySelector('updated').innerHTML).getTime();
                                isFindLabNext = true;
                                break;
                            }
                        }
                        if (isFindLabNext) { continue; }
                    }

                    //lab測試完成
                    if (entrys[i].querySelector('category[term="Lab測試1"]')) {
                        for (var j = i; j >= 0; j--) {
                            if (entrys[j].querySelector('category[term="上線中"]')) {
                                labTestTime += new Date(entrys[j].querySelector('updated').innerHTML).getTime() - new Date(entrys[i].querySelector('updated').innerHTML).getTime();
                                isFindLabNext = true;
                                break;
                            }
                        }
                        if (isFindLabNext) { continue; }
                    }

                    //等待修正
                    if (entrys[i].querySelector('category[term="重新開發/修正"]')) {
                        for (var j = i; j >= 0; j--) {
                            if (entrys[j].querySelector('category[term="InProgress"]')) {
                                waitTime += new Date(entrys[j].querySelector('updated').innerHTML).getTime() - new Date(entrys[i].querySelector('updated').innerHTML).getTime();
                                break;
                            }
                        }
                        continue;
                    }

                    //上線作業
                    if (entrys[i].querySelector('category[term="上線中"]')) {
                        for (var j = i; j >= 0; j--) {
                            if (entrys[j].querySelector('category[term="OL測試"]')) {
                                waitOLTime += new Date(entrys[j].querySelector('updated').innerHTML).getTime() - new Date(entrys[i].querySelector('updated').innerHTML).getTime();
                                break;
                            }
                        }
                        continue;
                    }

                    //上線作業
                    var isFindOLTestNext = false;
                    if (entrys[i].querySelector('category[term="OL測試"]')) {
                        for (var j = i; j >= 0; j--) {
                            if (entrys[j].querySelector('category[term="Done"]')) {
                                stgTestTime += new Date(entrys[j].querySelector('updated').innerHTML).getTime() - new Date(entrys[i].querySelector('updated').innerHTML).getTime();
                                isFindOLTestNext = true;
                                break;
                            }
                        }
                        if (isFindOLTestNext) { continue; }
                    }

                    //OL測試被退回
                    if (entrys[i].querySelector('category[term="OL測試"]')) {
                        for (var j = i; j >= 0; j--) {
                            if (entrys[j].querySelector('category[term="重新開發/修正"]')) {
                                stgTestTime += new Date(entrys[j].querySelector('updated').innerHTML).getTime() - new Date(entrys[i].querySelector('updated').innerHTML).getTime();
                                isFindOLTestNext = true;
                                break;
                            }
                        }
                        if (isFindOLTestNext) { continue; }
                    }

                }

                // 各階段區分 （等待工程認領,工程處理,測試中,等待上線）
                _item.waitTime = (waitTime / 1000 ).toFixed(0); // issue create to inprocess
                _item.techTime = (techTime / 1000 ).toFixed(0); // issue inprocess to lab test
                _item.labTestTime = (labTestTime / 1000 ).toFixed(0); // lab test  to 等待上OL
                _item.waitOLTime = (waitOLTime / 1000 ).toFixed(0); // 等待上OL  to OL測試
                _item.stgTestTime = (stgTestTime / 1000 ).toFixed(0); // staging test to done

                issueItems.push(_item);
            }
        }
    }

    //算平均
    var sumWaitTime = 0,sumTechTime = 0,sumLabTestTime = 0,sumWaitOLTime = 0,sumStgTestTime = 0 ;
    for (let item of issueItems) {
        sumWaitTime += parseInt(item.waitTime,10);
        sumTechTime += parseInt(item.techTime,10);
        sumLabTestTime += parseInt(item.labTestTime,10);
        sumWaitOLTime += parseInt(item.waitOLTime,10);
        sumStgTestTime += parseInt(item.stgTestTime,10);
    }

    var sumItem = {
        key: 'AVG',
        waitTime: formatSeconds((sumWaitTime / (issueItems.length))),
        techTime: formatSeconds((sumTechTime / (issueItems.length))),
        labTestTime: formatSeconds((sumLabTestTime / (issueItems.length))),
        waitOLTime: formatSeconds((sumWaitOLTime / (issueItems.length))),
        stgTestTime: formatSeconds((sumStgTestTime / (issueItems.length)))
    }

    issueItems.push(sumItem);

    var _tb = buildHtmlTable(issueItems);
    return _tb.outerHTML;
}

function formatSeconds(value) { 
    var theTime = parseInt(value);// 需要转换的时间秒 
    var theTime1 = 0;// 分 
    var theTime2 = 0;// 小时 
    var theTime3 = 0;// 天
    if(theTime > 60) { 
        theTime1 = parseInt(theTime/60); 
        theTime = parseInt(theTime%60); 
        if(theTime1 > 60) { 
            theTime2 = parseInt(theTime1/60); 
            theTime1 = parseInt(theTime1%60); 
            if(theTime2 > 24){
                //大于24小时
                theTime3 = parseInt(theTime2/24);
                theTime2 = parseInt(theTime2%24);
            }
        } 
    } 
    var result = '';
    if(theTime > 0){
        result = ""+parseInt(theTime)+"秒";
    }
    if(theTime1 > 0) { 
        result = ""+parseInt(theTime1)+"分 "+result; 
    } 
    if(theTime2 > 0) { 
        result = ""+parseInt(theTime2)+"時 "+result; 
    } 
    if(theTime3 > 0) { 
        result = ""+parseInt(theTime3)+"天 "+result; 
    }
    return result; 
} 

var _table_ = document.createElement('table'),
    _tr_ = document.createElement('tr'),
    _th_ = document.createElement('th'),
    _td_ = document.createElement('td');

function buildHtmlTable(arr) {
    var table = _table_.cloneNode(false),
        columns = addAllColumnHeaders(arr, table);
    for (var i = 0, maxi = arr.length; i < maxi; ++i) {
        var tr = _tr_.cloneNode(false);
        for (var j = 0, maxj = columns.length; j < maxj; ++j) {
            var td = _td_.cloneNode(false);
            cellValue = arr[i][columns[j]];
            td.appendChild(document.createTextNode(arr[i][columns[j]] || ''));
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    return table;
}


function addAllColumnHeaders(arr, table) {
    var columnSet = [],
        tr = _tr_.cloneNode(false);
    for (var i = 0, l = arr.length; i < l; i++) {
        for (var key in arr[i]) {
            if (arr[i].hasOwnProperty(key) && columnSet.indexOf(key) === -1) {
                columnSet.push(key);
                var th = _th_.cloneNode(false);
                th.appendChild(document.createTextNode(key));
                tr.appendChild(th);
            }
        }
    }
    table.appendChild(tr);
    return columnSet;
}

chrome.runtime.sendMessage({
    action: "getSource",
    source: DOMtoString(document)
});