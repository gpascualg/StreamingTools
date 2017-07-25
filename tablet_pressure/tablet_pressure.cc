#include <node.h>
#include <windows.h>
#include <math.h>
#include <string.h>


#include "wintab.h"			// NOTE: get from wactab header package
#define PACKETDATA      (PK_X | PK_Y | PK_BUTTONS | PK_NORMAL_PRESSURE | \
						 PK_ORIENTATION | PK_CURSOR)
#define PACKETMODE      0
#include "pktdef.h"			// NOTE: get from wactab header package

#include "msgpack.h"
#include "Utils.h"

using namespace v8;
using v8::Function;
using v8::FunctionCallbackInfo;

char*	gpszProgramName = "TiltTest";
HCTX instance;
HWND hwnd;

void isInstalled(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();

	struct	tagAXIS TpOri[3];	// The capabilities of tilt (required)
	double	dblTpvar;				// A temp for converting fix to double (for example)

	BOOL bReturn = TRUE;

	// check if WinTab available.
	if (!gpWTInfoA(0, 0, NULL)) {
		//TRACE("WinTab Services Not Available.");
		bReturn = FALSE;
	}

    /*
	if(bReturn){
		// get info about tilt
		t_bTiltSupport = WTInfo(WTI_DEVICES,DVC_ORIENTATION,&TpOri);
		if (t_bTiltSupport) {
			//JCB
			m_strTiltWords = "Tablet supports tilt";

			//used for example
			// does the tablet support azimuth and altitude
			if (TpOri[0].axResolution && TpOri[1].axResolution) {

				// convert azimuth resulution to double
				dblTpvar = FIX_DOUBLE(TpOri[0].axResolution);
				// convert from resolution to radians
				t_dblAziFactor = dblTpvar/(2*pi);

				// convert altitude resolution to double
				dblTpvar = FIX_DOUBLE(TpOri[1].axResolution);
				// scale to arbitrary value to get decent line length
				t_dblAltFactor = dblTpvar/1000;
				 // adjust for maximum value at vertical
				t_dblAltAdjust = (double)TpOri[1].axMax/t_dblAltFactor;
			}
			//end of used for example
		}
		else {  // no so don't do tilt stuff
			t_bTiltSupport = FALSE;
			m_strTiltWords = "Tablet does NOT supports tilt!";
		}	//end tilt support
	}	//end does tablet exists
    */

    args.GetReturnValue().Set(Boolean::New(isolate, bReturn));
}

void pressure(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();

    BOOL bReturn = FALSE;
    PACKET	pkt;	// the current packet
    int nMaxPkts = 1;

    int readNum = gpWTPacketsGet(instance, 1, &pkt);
    gpWTPacketsGet(instance, 0, NULL); // Flush
    if (readNum >= 0) {
        args.GetReturnValue().Set(Integer::New(isolate, pkt.pkNormalPressure));
        return;
    }

    args.GetReturnValue().Set(Integer::New(isolate, readNum));
}

bool InitTablet() {
	LOGCONTEXT      lcMine;           // The context of the tablet

	//TABLET: get current settings as a starting point for this context of the tablet.
	//WTInfo(WTI_DEFCONTEXT, 0, &lcMine);	// default settings may be different to current settings
	gpWTInfoA(WTI_DEFSYSCTX, 0, &lcMine);	// current settings as set in control panel

	lcMine.lcOptions |= CXO_MESSAGES;	// keep existing options and make sure message handling is on for this context
	//TABLET: PACKETDATA must be defined FIRST before including pktdef.h. See the header file of this class for more details
	lcMine.lcPktData = PACKETDATA;	// these settings MUST be defined in the pktdef.h file, see notes
	lcMine.lcPktMode = PACKETMODE;
	lcMine.lcMoveMask = PACKETDATA;

    AllocConsole();
    hwnd = GetConsoleWindow();
    ShowWindow(hwnd, SW_HIDE);

    /*
    hwnd = CreateWindowEx(
        0,
		"TiltTestWClass",
		"Name",
		WS_OVERLAPPEDWINDOW,
		CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
		NULL,
		NULL,
		GetModuleHandle(NULL),
		NULL
	);
    */

    printf("GHWND: %llx\n", (intptr_t)GetConsoleWindow());
    printf("GHWND: %llx\n", (intptr_t)GetCurrentProcess());
    printf("Hinst: %llx\n", (intptr_t)GetModuleHandle(NULL));
    printf("HWND: %llx\n", (intptr_t)hwnd);
    printf("LastErr: %x\n", GetLastError());

    if (!hwnd)
    {
        printf("ERROR");
        return false;
    }

	instance = gpWTOpenA(hwnd, &lcMine, TRUE);
    return instance != 0;
}

void initialize(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    args.GetReturnValue().Set(Boolean::New(isolate, LoadWintab() && InitTablet()));
}

void keyState(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  int keyCode = (int)args[0]->IntegerValue();
	int state = (int)args[1]->IntegerValue();
  args.GetReturnValue().Set(Boolean::New(isolate, GetAsyncKeyState(keyCode) & state));
}

void init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "initialize", initialize);
  NODE_SET_METHOD(exports, "isInstalled", isInstalled);
	NODE_SET_METHOD(exports, "keyState", keyState);
  NODE_SET_METHOD(exports, "pressure", pressure);
}

NODE_MODULE(tablet_pressure, init)
