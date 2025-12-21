#pragma once

#include <Arduino.h>
#include <time.h>

// ─────────────────────────────────────────────
//  Callback type definitions
// ─────────────────────────────────────────────
//typedef void (*TimeCallback)(void);
//typedef void (*TimeCallback)(const tm* tm_now);
typedef void (*TimeCallback)(const struct tm* tm_now);

void TimeService_Init(
    TimeCallback onSecond = nullptr, 
    TimeCallback onMinute = nullptr, 
    TimeCallback onHour = nullptr, 
    TimeCallback onDay = nullptr,
    TimeCallback onWeek = nullptr, 
    TimeCallback onMonth = nullptr, 
    TimeCallback onYear = nullptr, 
    TimeCallback onDstChange = nullptr
);


bool TimeService_Tick(void);
struct tm TimeService_GetTimeStruct(void);



