#pragma once

#include <Arduino.h>

#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include "LittleFS.h"

#include <appdata.h>        // here is data from compressScript stored, see tools/Compress.py

#define ListHiddenFiles false
#define EnableDelete true

constexpr bool GZippedContent = true;

AsyncWebServer* SetupWebserver();