import math
import datetime
import requests
import io
import json

#Scheduler actions must run after 12am UTC
Current = datetime.datetime.utcnow()
Today = datetime.datetime.utcnow() #datetime.datetime(2020, 12, 31, 0, 0, 0, 0, tzinfo=datetime.timezone.utc)
Yesterday = Today - datetime.timedelta(days=1) #datetime.datetime(2021, 1, 1, 0, 0, 0, 0, tzinfo=datetime.timezone.utc) 
Month = {
  "Jan": 1,
  "Feb": 2,
  "Mar": 3,
  "Apr": 4,
  "May": 5,
  "Jun": 6,
  "Jul": 7,
  "Aug": 8,
  "Sep": 9,
  "Oct": 10,
  "Nov": 11,
  "Dec": 12
}
DayOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"]
ColHeader = ["Date","Open","High","Low","Close","AdjClose","Volume"]

def get_spx_data(_currentJsonContent: str) -> str:
	url = "https://finance.yahoo.com/quote/%5EGSPC/history"
	headers = {
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36'
	}
	resultStartStr = "Volume</span></th></tr></thead>"
	resultEndStr = "</tbody>"
	startPeriod = math.trunc(datetime.datetime(Yesterday.year, Yesterday.month, Yesterday.day, 0, 0, 0, tzinfo=datetime.timezone.utc).timestamp())
	endPeriod = math.trunc(datetime.datetime(Today.year, Today.month, Today.day, 0, 0, 0, tzinfo=datetime.timezone.utc).timestamp()) #startPeriod = endPeriod - 86400 #1 day earlier
	Config = {'period1': startPeriod, 'period2': endPeriod, 'interval': '1d', 'filter': 'history', 'frequency': '1d', 'includeAdjustedClose': 'true'}
	#print(Config)
	resp = requests.get(url, headers=headers, params=Config)
	resp.raise_for_status()
	resultStr = ((resp.text.split(resultStartStr))[1]).split(resultEndStr)

	return process_table(_currentJsonContent, resultStr[0])

def process_table(_currentJsonContent, _html: str) -> str:
	TotalDay = [0,0,0,0,0] #Mon=0 > Fri =4
	TotalDayPositive = [0,0,0,0,0] 
	result = ""
	lastDateFromJson = "";
	cacheDayData = ""
	cacheWeekday = 0
	weekday = 0
	counter = 0
	tmrCloseValue = 0
	lastCloseValueFromJson = 0
	tmrPL = 0
	openCloseDiff = 0
	breakOutFlag = False

	if _currentJsonContent:
		lastCloseValueFromJson = (_currentJsonContent["SPX"][0])["Close"] #float(((((lastAvailableDayData.split("\"Close\":"))[1]).split(","))[0]).strip())
		lastDateFromJson = (_currentJsonContent["SPX"][0])["Date"]
	if "</tr>" in _html: #Only proceed if have data
		resultByDay = _html.split("</tr>")
		for dayData in resultByDay:
			if cacheDayData:
				result= f"{result}{cacheDayData}\"OpenCloseDiff\": {openCloseDiff},"
				cacheDayData = ""
				cacheWeekday= weekday

			counter = 0;
			shareData = dayData.split("</span>")
			for sData in shareData:
				data = sData.split(">")
				if((data[-1]).strip()):
					if(counter ==0):
						date = (data[-1]).strip().replace(",","")
						if (lastDateFromJson.replace('"', '') == date):
							breakOutFlag = True
							break
						cacheDayData= f"{cacheDayData}"+'\n{"Date": '+f"\"{date}\", "
						dateInfo = date.split(" ")
						weekday = datetime.datetime(int(dateInfo[2]), Month[dateInfo[0]], int(dateInfo[1]), 8, 0, 0, 173504).weekday()
						cacheDayData= f"{cacheDayData}\"DoW\": "+f"\"{DayOfWeek[weekday]}\", "
					else:
						cacheDayData= f"{cacheDayData}\"{ColHeader[counter]}\": " + (data[-1]).strip().replace(",","") +", "
						if(counter ==1):
							openCloseDiff = float((data[-1]).strip().replace(",",""))
						elif(counter ==4):
							tempInt = round(float((data[-1]).strip().replace(",","")),2)
							openCloseDiff = round(tempInt - openCloseDiff ,2)
							tmrPL = round(tmrCloseValue - tempInt,2)
							tmrCloseValue = tempInt
					counter+=1
			if breakOutFlag:
				break;
			if (result) and (counter >0):
				result= f"{result}\"DailyPL\": {tmrPL}" +'},' +f"{cacheDayData}\"OpenCloseDiff\": {openCloseDiff},"
				cacheDayData = ""
				TotalDay[cacheWeekday]+=1
				if(tmrPL>0):
					TotalDayPositive[cacheWeekday]+=1
				cacheWeekday= weekday

		#Clear last cache
		if _currentJsonContent:
			jsonToPrint = ""
			if result: #only if have valid data to be append
				for y in range(5):
					((_currentJsonContent["Statistics"])["TotalDay"])[y] +=TotalDay[y]
					((_currentJsonContent["Statistics"])["TotalDayPositive"])[y] +=TotalDayPositive[y]
				tmrPL = round(tmrCloseValue - lastCloseValueFromJson,2)
				result= f"{result}\"DailyPL\": {tmrPL}" +'},'
				((_currentJsonContent["Statistics"])["TotalDay"])[cacheWeekday] +=1
				if(tmrPL>0):
					((_currentJsonContent["Statistics"])["TotalDayPositive"])[cacheWeekday] +=1
				jsonToPrint = json.dumps(_currentJsonContent)
				jsonToPrint = jsonToPrint.replace('"SPX": [', '"SPX": [' + f"{result}") 
				jsonToPrint = jsonToPrint.replace('}],', '}],\n')
				jsonToPrint = jsonToPrint.replace('},{', '},\n{')
				jsonToPrint = jsonToPrint.replace('}, {', '},\n{')

			return (jsonToPrint)
		else:
			TotalDay[cacheWeekday]+=1
			result= f"{result}\"DailyPL\": 0.01" +'}'
			result = '{\"DLM\": \"'+f"{Current}"+'\",\"SPX\": [' +f"{result}" + '\n],\n"Statistics": {\"TotalDay\": '+f"{TotalDay}"+', \"TotalDayPositive\": '+f"{TotalDayPositive}" +'}'
			return (f"{result}" + '\n}')

	return ("")

def main():
	filename = f"model-spx/{Yesterday.year}.json"
	currentJsonContent = ""
	try:
		sourceFile = open(filename,)
		currentJsonContent = json.load(sourceFile)
		sourceFile.close()
	except:
		print("File not exists!")

	currentJsonContent = get_spx_data(currentJsonContent)
	if currentJsonContent:
		sourceFile2 = open(filename, 'w')
		print(currentJsonContent, file = sourceFile2)
		sourceFile2.close()
		print("Done update data.")
	else:
		print("No new data found.")


if __name__ == "__main__":
    main()