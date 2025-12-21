/*

    TimeService

    Intended to call callbacks on new second, minute, hour & day.
    Gives a clean callback interface to main.


    init with: 
        TimeService_Init(TimeCallback onSecond, TimeCallback onMinute, TimeCallback onHour, TimeCallback onDay);
    and call in your loop at least every second:
        TimeService_Tick();

    TimeService_Tick will also give back true on new second.



*/

#include "timeService.h"

static TimeCallback secondCallback;
static TimeCallback minuteCallback;
static TimeCallback hourCallback;
static TimeCallback dayCallback;
static TimeCallback weekCallback; 
static TimeCallback monthCallback; 
static TimeCallback yearCallback;
static TimeCallback dstChangeCallback;

static time_t before = 0;
static time_t bootTime = 0;
static int dstBefore = 0;

static struct tm tm_now;

void TimeService_Init(TimeCallback onSecond, 
    TimeCallback onMinute, 
    TimeCallback onHour, 
    TimeCallback onDay,
    TimeCallback onWeek, 
    TimeCallback onMonth, 
    TimeCallback onYear, 
    TimeCallback onDstChange
){
    secondCallback = onSecond;
    minuteCallback = onMinute;
    hourCallback   = onHour;
    dayCallback    = onDay;
    weekCallback = onWeek;
    monthCallback = onMonth;
    yearCallback = onYear;
    dstChangeCallback = onDstChange;

    dstBefore = tm_now.tm_isdst;
}

bool TimeService_Tick(void)     // call at least once every second
{
    time_t now;

    time(&now);
    if (now == before)
        return false;  // no new second yet

    before = now;                       // FIXME, build a check for lost seconds ? So before+1 should be now
    localtime_r(&now, &tm_now);

    if (!bootTime && tm_now.tm_year > 0)
        bootTime = now;

    // Check and call registered callbacks if not NULL
    if (secondCallback) secondCallback(&tm_now);                       // since we return earlier when no second has passed, we have a new second here

    // fallthru construction, when we are here, we have a new second, now check whether we have new minute, hour, day
    if (tm_now.tm_sec != 0) return true;

    if (minuteCallback) minuteCallback(&tm_now);                        // we have a new minute since second == 0, if callback...

    if (tm_now.tm_min != 0) return true;

    if (tm_now.tm_isdst != dstBefore){                                  // dst change, remember, will trigger at init probably and changes @ half hour are not supported
        dstBefore = tm_now.tm_isdst;
        if (dstChangeCallback) dstChangeCallback(&tm_now);
    }

    if (hourCallback != 0) hourCallback(&tm_now);                       // we have a new hour since minute == 0 & second == 0, if callback...
    
    if (tm_now.tm_hour != 0) return true;

    if (dayCallback) dayCallback(&tm_now);                              // we have a new day since hour == 0, minute == 0, second == 0, if callback...

    if (tm_now.tm_wday == 0 && weekCallback) weekCallback(&tm_now);

    if (tm_now.tm_mday == 0 && monthCallback) monthCallback(&tm_now);

    if (tm_now.tm_yday == 0 && yearCallback) yearCallback(&tm_now);
    
    return true;
}
