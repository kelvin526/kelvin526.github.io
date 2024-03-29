var parentURL = "https://kelvin526.github.io/model-spx/"; 
var jsonFileName = ""; 
var spxModel;
var currentUrl = window.location.href;
let params = (new URL(currentUrl)).searchParams;
let year = params.get("year");

var dlm;
var dailyData;
var statisticsData;
const rawTableHeader = ["Date", "DoW", "Daily P&L", "Open","Close","High","Low","Volume", "Close-Open"];
const dayStr = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

	  
if(parseInt(year).toString().length == 4)
{
	console.log(year)
	resetErrorMsg();
	resetContent();
	jsonFileName =  year.toString();
	//console.log(parentURL + jsonFileName + ".json");
	$.getJSON(parentURL + jsonFileName + ".json", function(result){
		//console.log(result.DLM);
		spxModel=result;
		setContent();
	})
	.fail(function() { setErrorMsg("Opss! No data available for year " + year.toString() + "!");  });	
}
else if(year)
{
	setErrorMsg("Invalid value : <strong>" + year.toString() +"</strong>! Please keyin valid year value <i>eg. 2010, 2021 etc.</i>");
}

document.getElementById("yearInput")
	.addEventListener("keyup", function(event) {
	if (event.keyCode === 13) { // Number 13 is the "Enter" key on the keyboard
		resetContent();
		resetErrorMsg();
		input = parseInt(document.getElementById("yearInput").value)
		year = input
		if(!(input.toString().length == 4))
		{
			setErrorMsg("Invalid value : <strong>" + document.getElementById("yearInput").value +"</strong>! Please keyin valid year value <i>eg. 2010, 2021 etc.</i>");
		}
		else
		{
			resetErrorMsg();
			jsonFileName =  input.toString();
			$.getJSON(parentURL + jsonFileName + ".json", function(result){
				spxModel=result;
				setContent();
			})
			.fail(function() { setErrorMsg("Opss! No data available for year " + input.toString() + "!"); });
		}
	}
});

document.getElementById("rangeInput")
	.addEventListener("keyup", function(event) {
	if (event.keyCode === 13) { // Number 13 is the "Enter" key on the keyboard
		input = parseInt(document.getElementById("rangeInput").value)
		if((input.toString().length >=1))
		{
			drawChartWithInput(input)
		}
	}
});

//=================== Function Zone ===================
function drawChart()
{
	/*
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'Day of Week');
	data.addColumn('number', '+ve');
	data.addColumn('number', '-ve');
	
	for (var i = 0; i < spxModel.Statistics.TotalDay.length; i++) {
		data.addRows([
		  [dayStr[i], spxModel.Statistics.TotalDayPositive[i], (spxModel.Statistics.TotalDay[i] - spxModel.Statistics.TotalDayPositive[i])]
		]);
	}
	
	var view = new google.visualization.DataView(data);
      view.setColumns([0, 1,{ calc: "stringify",sourceColumn: 1,type: "string",role: "annotation" },
                       2,{ calc: "stringify",sourceColumn: 2,type: "string",role: "annotation" }]);
	var chart = new google.visualization.ColumnChart(document.getElementById('pnlByDay2')); //ComboChart
	//chart.draw(view, { 'title': "SPX Daily Data Year " + (year).toString(), 'isStacked': true, 'legend': 'bottom','vAxis': {'title': 'Total days'}, 'colors': ['#3EA055', '#F67280']});
	chart.draw(view, { 'title': "SPX Daily Data Year " + (year).toString(), 'isStacked': 'percent', 'legend': 'bottom','vAxis': {'title': 'Total days %'}, 'colors': ['#3EA055', '#F67280']});
	*/

	var linePosOpenPosPL = [0,0,0,0,0];
	var linePosOpenNegPL = [0,0,0,0,0];
	var lineNegOpenPosPL = [0,0,0,0,0];
	var lineNegOpenNegPL = [0,0,0,0,0];
	var tmrDailyPL = 0;
	var tmrOpen = 0;
	var tmrDoW = -1;
	for (const _data of spxModel.SPX) {
		if(tmrDoW >=0)
		{
			if(tmrOpen >= _data.Close)
			{
				if(tmrDailyPL>= 0){
					linePosOpenPosPL[tmrDoW]++;
				}
				else{
					linePosOpenNegPL[tmrDoW]++;
				}
			}
			else{
				if(tmrDailyPL>= 0)
				{
					lineNegOpenPosPL[tmrDoW]++;
				}
				else
				{
					lineNegOpenNegPL[tmrDoW]++;
				}
			}
		}
		tmrOpen = _data.Open;
		tmrDailyPL = _data.DailyPL;
		tmrDoW = dayStr.indexOf(_data.DoW);
	}
	
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'Day of Week');
	data.addColumn('number', '+O,+PL');
	data.addColumn('number', '-O,+PL');
	data.addColumn('number', '-O,-PL');
	data.addColumn('number', '+O,-PL');
	for (var i = 0; i < lineNegOpenNegPL.length; i++) {
		data.addRows([
		  [dayStr[i], linePosOpenPosPL[i], lineNegOpenPosPL[i],lineNegOpenNegPL[i], linePosOpenNegPL[i]]
		]);
	}
	//console.log(data);
	var view = new google.visualization.DataView(data);
      view.setColumns([0, 1,{ calc: "stringify",sourceColumn: 1,type: "string",role: "annotation" },
                       2,{ calc: "stringify",sourceColumn: 2,type: "string",role: "annotation" },
					   3,{ calc: "stringify",sourceColumn: 3,type: "string",role: "annotation" },
					   4,{ calc: "stringify",sourceColumn: 4,type: "string",role: "annotation" }]);
	var chart = new google.visualization.ColumnChart(document.getElementById('pnlByDay2')); //ComboChart
	chart.draw(view, { 'title': "SPX Daily Open (O) vs PL Trend " + (year).toString(), 'isStacked': 'percent', 'legend': 'bottom','vAxis': {'title': 'Total days %'}, 'colors': ['#3EA055', '#254117', '#F67280', '#7E3517']});

}

function drawChartWithInput(inputValue = 0) //(inputValue = 25)
{
	var data = new google.visualization.DataTable();
	data.addColumn('string', 'Day of Week');
	data.addColumn('number', '+ve');
	data.addColumn('number', '-ve');
	var totalPositive = [0,0,0,0,0]
	var totalNegative = [0,0,0,0,0]
	var titleName = "";

	if(document.getElementById('hlr').checked) {
		titleName = "SPX High Low Change > ";
		for (var dateData of spxModel.SPX) {
			if(dateData.DailyPL >= inputValue)
			{
				totalPositive[dayStr.indexOf(dateData.DoW)] ++;
			}
			else if(dateData.DailyPL < (inputValue*-1))
			{
				totalNegative[dayStr.indexOf(dateData.DoW)] ++;
			}			
			dayStr.indexOf(dateData.DoW);
		}
	}else{
		titleName = "SPX Close Open Change > ";
		for (var dateData of spxModel.SPX) {
			if(dateData.OpenCloseDiff >= inputValue)
			{
				totalPositive[dayStr.indexOf(dateData.DoW)] ++;
			}
			else if(dateData.OpenCloseDiff < (inputValue*-1))
			{
				totalNegative[dayStr.indexOf(dateData.DoW)] ++;
			}			
			dayStr.indexOf(dateData.DoW);
		}
	}
	
	for (var i = 0; i < totalPositive.length; i++) {
		data.addRows([
		  [dayStr[i], totalPositive[i], totalNegative[i]]
		]);
	}
	
	var view = new google.visualization.DataView(data);
      view.setColumns([0, 1,
                       { calc: "stringify",
                         sourceColumn: 1,
                         type: "string",
                         role: "annotation" },
                       2,
                       { calc: "stringify",
                         sourceColumn: 2,
                         type: "string",
                         role: "annotation" }]);

	var chart = new google.visualization.ColumnChart(document.getElementById('pnlByDay1'));
	chart.draw(view, { 'title': titleName + (inputValue).toString(), 'isStacked': 'percent', 'legend': 'bottom','vAxis': {'title': 'Total days  %'}, 'colors': ['#3EA055', '#F67280']});
	
}

function drawCandlestick()
{
	var numbDays = 15;
	//header, high/low, open, close, low/high  > if close-open>0, then: low, open, close, high, else: high, open, close, low
	var arrData = [];
	for( var x = numbDays - 1; x>=0; x--)
	{
		var arr = [];
		arr.push(((spxModel.SPX[x]).Date).replace(year, "").trim());
		arr.push((spxModel.SPX[x]).High);
		arr.push((spxModel.SPX[x]).Open);
		arr.push((spxModel.SPX[x]).Close);
		arr.push((spxModel.SPX[x]).Low);
		arrData.push(arr);
	}

	var data = google.visualization.arrayToDataTable(arrData, true); // Treat first row as data as well.
	// Set chart options
	var options = {
		title: "SPX Candlestick for last " + (numbDays).toString() + " day",
		legend: 'none',
		bar: { groupWidth: '50%' }, // Remove space between bars.
		candlestick: {
			fallingColor: { strokeWidth: 0, fill: 'red' },
			risingColor: { strokeWidth: 0, fill: 'green' }
		},
		colors: ['black']
	};
	
	var chart = new google.visualization.CandlestickChart(document.getElementById('pnlByDay0'));
	chart.draw(data, options);
}

function setContent()
{
	document.getElementById("headerTitle").innerHTML = "SPX Statistics Data Year " + year;
	document.getElementById("dlm").innerHTML = "<b>Last Modified: </b>" + spxModel.DLM + "<b> &emsp; Loaded @ </b>" + Date().slice(16,24);
	createRawDataTable();
	createStatisticsView();
	$('#table').excelTableFilter({
        columnSelector: '.apply-filter'
    });
}

function createRawDataTable()
{
	var _rawData = "";
	//Add header
	_rawData = _rawData.concat('<table id="table" style="width:100%;"><thead><tr>');
	rawTableHeader.forEach(
		function(item, array){
			if ((`${item}` == 'DoW') || (`${item}` == 'Date')){
				_rawData = _rawData.concat('<th class="apply-filter">'+`${item}`+'</th>');
			}
			else {
				_rawData = _rawData.concat('<th >'+`${item}`+'</th>');
			}
		});
	//Add Table content
	_rawData = _rawData.concat('<tr></thead><tbody>');

	for (var dateData of spxModel.SPX) {

		_rawData = _rawData.concat('<tr style="display: "";" class="child',`${year}`,'"><td>',dateData.Date,'</td><td>',dateData.DoW,'</td><td>',dateData.DailyPL,'</td><td>'
		  ,dateData.Open,'</td><td>',dateData.Close,'</td><td>',dateData.High,'</td><td>',dateData.Low,'</td><td>',dateData.Volume
		  ,'</td><td>',dateData.OpenCloseDiff,'</td></tr>');
	}

	_rawData = _rawData.replaceAll("undefined", "");
	_rawData = _rawData.concat('</tr><tbody></table>');
	document.getElementById("rawData").innerHTML = _rawData; 	//console.log(`${_rawData}`);

	//Add click event to collapsible content
	var coll = document.getElementsByClassName("collapsible");
	var i;
	for (i = 0; i < coll.length; i++) {
	  coll[i].addEventListener("click", function() {
		this.classList.toggle("active"); //pointUp = "&#9660;"; pointDown = "&#9650;";
		
		var coll2 = document.getElementsByClassName("child"+this.id);
		if(coll2.length > 0)
		{
			var style = "";
			if(coll2[0].style.display == "") {
				style = "none";
				this.innerHTML = '&#9660' + this.innerHTML.substring(1); 
			}
			else {
				this.innerHTML = '&#9650' + this.innerHTML.substring(1); 
			}
			for (i = 0; i < coll2.length; i++) {
			  coll2[i].style.display = style;
			}
		}
		
	  });
	}
}

function createStatisticsView()
{
	google.charts.load('current', {'packages':['bar', 'corechart']});
	google.charts.setOnLoadCallback(drawChart);
	google.charts.setOnLoadCallback(drawCandlestick);
	google.charts.setOnLoadCallback(drawChartWithInput);
	input = parseInt(document.getElementById("rangeInput").value);
}

function resetContent()
{
	document.getElementById("headerTitle").innerHTML = "SPX Statistics Data Year ...";
	document.getElementById("dlm").innerHTML = "Loaded @ </b>" + Date().slice(16,24);
	document.getElementById("rawData").innerHTML = "";
}

function resetContentAll()
{
	resetContent();
	document.getElementById('pnlByDay0').innerHTML = "";
	document.getElementById('pnlByDay1').innerHTML = "";
	document.getElementById('pnlByDay2').innerHTML = "";
}

function setErrorMsg(msg)
{
	resetContentAll();
	document.getElementById("error-area").innerHTML = msg;
	document.getElementById("error-area").style.display = "inherit";
}

function resetErrorMsg()
{
	document.getElementById("error-area").innerHTML = ""; 
	document.getElementById("error-area").style.display = "none";
}
