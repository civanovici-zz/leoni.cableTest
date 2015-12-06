/* 
	Editor: http://www.visualmicro.com
	        visual micro and the arduino ide ignore this code during compilation. this code is automatically maintained by visualmicro, manual changes to this file will be overwritten
	        the contents of the Visual Micro sketch sub folder can be deleted prior to publishing a project
	        all non-arduino files created by visual micro and all visual studio project or solution files can be freely deleted and are not required to compile a sketch (do not delete your own code!).
	        note: debugger breakpoints are stored in '.sln' or '.asln' files, knowledge of last uploaded breakpoints is stored in the upload.vmps.xml file. Both files are required to continue a previous debug session without needing to compile and upload again
	
	Hardware: Arduino Mega w/ ATmega2560 (Mega 2560), Platform=avr, Package=arduino
*/

#define __AVR_ATmega2560__
#define ARDUINO 164
#define ARDUINO_MAIN
#define F_CPU 16000000L
#define __AVR__
extern "C" void __cxa_pure_virtual() {;}

//
int freeRam ();
//
void checkMachineState();
float fmap(float x, float in_min, float in_max, float out_min, float out_max);
void startCheckingCable();
void checkCablePresent();
void debugInputs();
void moving();
void stopMovement();
void printTitle(char *msg);
void printMessage(char *msg[]);
void draw();
void debug(char *msg[]);
void buzz(int k);
void debounceEmergency(int reading);

#include "C:\Arduino1.6.4\hardware\arduino\avr\variants\mega\pins_arduino.h" 
#include "C:\Arduino1.6.4\hardware\arduino\avr\cores\arduino\arduino.h"
#include <cableTest.ino>
#include <pitches.h>
