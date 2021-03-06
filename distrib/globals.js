/* ------------
   Globals.ts

   Global CONSTANTS and _Variables.
   (Global over both the OS and Hardware Simulation / Host.)

   This code references page numbers in the text book:
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */
//
// Global CONSTANTS (TypeScript 1.5 introduced const. Very cool.)
//
var APP_NAME = "KaiOS"; // 'cause Bob and I were at a loss for a better name.
var APP_VERSION = "11"; // https://www.youtube.com/watch?v=R1ZXOOLMJ8s
var CPU_CLOCK_INTERVAL = 100; // This is in ms (milliseconds) so 1000 = 1 second.
var TIMER_IRQ = 0; // Pages 23 (timer), 9 (interrupts), and 561 (interrupt priority).
// NOTE: The timer is different from hardware/host clock pulses. Don't confuse these.
var KEYBOARD_IRQ = 1;
var PROCESS_EXIT = 2;
var CONTEXT_SWITCH = 3;
var CONSOLE_WRITE_IR = 4;
var BOUNDS_ERROR = 5;
var INVALID_OP = 6;
var FILE_SUCCESS = 0;
var FULL_DISK_SPACE = 1;
var FILE_NAME_ALREADY_EXISTS = 2;
var FILE_NAME_NO_EXIST = 3;
var ROUND_ROBIN = "rr";
var FCFS = "fcfs";
var PRIORITY = "priority";
var IN_DISK = 999;
var MAX_FILE_LENGTH = 56;
var DATE_LENGTH = 4;
var QUICK_FORMAT = 1;
var FULL_FORMAT = 0;
//
// Global Variables
// TODO: Make a global object and use that instead of the "_" naming convention in the global namespace.
//
var _CPU; // Utilize TypeScript's type annotation system to ensure that _CPU is an instance of the Cpu class.
var _Memory;
var _MemoryAccessor;
var _Disk;
var _OSclock = 0; // Page 23.
var _Mode = 0; // (currently unused)  0 = Kernel Mode, 1 = User Mode.  See page 21.
var _Canvas; // Initialized in Control.hostInit().
var _DrawingContext; // = _Canvas.getContext("2d");  // Assigned here for type safety, but re-initialized in Control.hostInit() for OCD and logic.
var _DefaultFontFamily = "sans"; // Ignored, I think. The was just a place-holder in 2008, but the HTML canvas may have use for it.
var _DefaultFontSize = 13.0;
var _FontHeightMargin = 4.0; // Additional space added to font size when advancing a line.
var _Pid = 0; // Number to assign to processes
var _Trace = true; // Default the OS trace to be on.
// The OS Kernel and its queues.
var _Kernel;
var _KernelInterruptQueue; // Initializing this to null (which I would normally do) would then require us to specify the 'any' type, as below.
var _KernelInputQueue = null; // Is this better? I don't like uninitialized variables. But I also don't like using the type specifier 'any'
var _KernelBuffers = null; // when clearly 'any' is not what we want. There is likely a better way, but what is it?
// The OS's memory manager
var _MemoryManager = null;
// The OS's process manager
var _ProcessManager = null;
// The OS's scheduler
var _Scheduler = null;
// The OS's swapper
var _Swapper = null;
// Standard input and output
var _StdIn; // Same "to null or not to null" issue as above.
var _StdOut;
// UI
var _Console;
var _OsShell;
// Extra piano sounds
var _PianoTime = false;
// Tracks if we're in single step mode or not
var _SingleStepMode = false;
// In single step mode, tracks if we are to go to the next step
var _NextStep = false;
// User status
var _UserStatus = "And now, the curtain rises.";
// At least this OS is not trying to kill you. (Yet.)
var _SarcasticMode = false;
// Global Device Driver Objects - page 12
var _krnKeyboardDriver; //  = null;
var _krnDiskDriver; //  = null;
var _hardwareClockID = null;
// For testing (and enrichment)...
var Glados = null; // This is the function Glados() in glados.js on Labouseur.com.
var _GLaDOS = null; // If the above is linked in, this is the instantiated instance of Glados.
var onDocumentLoad = function () {
    TSOS.Control.hostInit();
};
