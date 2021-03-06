///<reference path="../globals.ts" />
///<reference path="queue.ts" />
///<reference path="../host/control.ts" />
///<reference path="../host/devices.ts" />
///<reference path="deviceDriverKeyboard.ts" />
///<reference path="deviceDriverDisk.ts" />
///<reference path="memoryManager.ts" />
///<reference path="processManager.ts" />
///<reference path="scheduler.ts" />
///<reference path="shell.ts" />
/* ------------
     Kernel.ts

     Requires globals.ts
              queue.ts

     Routines for the Operating System, NOT the host.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
var TSOS;
(function (TSOS) {
    var Kernel = /** @class */ (function () {
        function Kernel() {
            //
            // OS Startup and Shutdown Routines
            //
            this.bsod = false;
        }
        Kernel.prototype.krnBootstrap = function () {
            TSOS.Control.hostLog("bootstrap", "host"); // Use hostLog because we ALWAYS want this, even if _Trace is off.
            // Initialize our global queues.
            _KernelInterruptQueue = new TSOS.Queue(); // A (currently) non-priority queue for interrupt requests (IRQs).
            _KernelBuffers = new Array(); // Buffers... for the kernel.
            _KernelInputQueue = new TSOS.Queue(); // Where device input lands before being processed out somewhere.
            // Initialize the console.
            _Console = new TSOS.Console(); // The command line interface / console I/O device.
            _Console.init();
            // Initialize standard input and output to the _Console.
            _StdIn = _Console;
            _StdOut = _Console;
            // Load the Keyboard Device Driver
            this.krnTrace("Loading the keyboard device driver.");
            _krnKeyboardDriver = new TSOS.DeviceDriverKeyboard(); // Construct it.
            _krnKeyboardDriver.driverEntry(); // Call the driverEntry() initialization routine.
            this.krnTrace(_krnKeyboardDriver.status);
            //
            // ... more?
            //
            // Yeah, there's more. 
            // Load the Disk Device Driver
            this.krnTrace("Loading the disk device driver");
            _krnDiskDriver = new TSOS.DeviceDriverDisk();
            _krnDiskDriver.driverEntry();
            this.krnTrace(_krnDiskDriver.status);
            // Load the memory manager.
            _MemoryManager = new TSOS.MemoryManager();
            // Load the process manager
            _ProcessManager = new TSOS.ProcessManager();
            // Load the scheduler
            _Scheduler = new TSOS.Scheduler();
            // Load the swapper
            _Swapper = new TSOS.Swapper();
            // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
            this.krnTrace("Enabling the interrupts.");
            this.krnEnableInterrupts();
            // Launch the shell.
            this.krnTrace("Creating and Launching the shell.");
            _OsShell = new TSOS.Shell();
            _OsShell.init();
            // Finally, initiate student testing protocol.
            if (_GLaDOS) {
                _GLaDOS.afterStartup();
            }
        };
        Kernel.prototype.krnShutdown = function () {
            this.krnTrace("begin shutdown OS");
            // TODO: Check for running processes.  If there are some, alert and stop. Else...
            if (_ProcessManager.isRunning()) {
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(PROCESS_EXIT, false));
            }
            // ... Disable the Interrupts.
            this.krnTrace("Disabling the interrupts.");
            this.krnDisableInterrupts();
            //
            // Unload the Device Drivers?
            // More?
            //
            this.krnTrace("end shutdown OS");
        };
        Kernel.prototype.krnOnCPUClockPulse = function () {
            /* This gets called from the host hardware simulation every time there is a hardware clock pulse.
               This is NOT the same as a TIMER, which causes an interrupt and is handled like other interrupts.
               This, on the other hand, is the clock pulse from the hardware / VM / host that tells the kernel
               that it has to look for interrupts and process them if it finds any.                           */
            // Check for an interrupt, are any. Page 560
            if (_KernelInterruptQueue.getSize() > 0) {
                // Process the first interrupt on the interrupt queue.
                // TODO: Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
                var interrupt = _KernelInterruptQueue.dequeue();
                this.krnInterruptHandler(interrupt.irq, interrupt.params);
            }
            else if (_CPU.isExecuting) {
                // Waits for the user to click on the next step button before cycling once, if single step mode is active.
                if (_SingleStepMode) {
                    if (_NextStep) {
                        _CPU.cycle();
                        // Update the CPU display
                        TSOS.Control.hostCPU();
                        _NextStep = false;
                        // Big brother scheduler is watching you...and your CPU cycles
                        _Scheduler.watch();
                        // Update the wait times and turnaround times for all processes
                        _ProcessManager.processStats();
                        // Update the memory display
                        TSOS.Control.hostMemory();
                        // Update the processes display
                        TSOS.Control.hostProcesses();
                    }
                    this.krnTrace("Idle");
                }
                else {
                    _CPU.cycle();
                    // Update the CPU display
                    TSOS.Control.hostCPU();
                    // Big brother scheduler is watching you...and your CPU cycles
                    _Scheduler.watch();
                    // Update the wait times and turnaround times for all processes
                    _ProcessManager.processStats();
                    // Update the memory display
                    TSOS.Control.hostMemory();
                    // Update the processes display
                    TSOS.Control.hostProcesses();
                }
            }
            else {
                _NextStep = false; // Handles the case for if the user presses next step in single step mode when nothing is executing
                this.krnTrace("Idle");
                // On each clock pulse, check to see if there is anything in the ready queue.
                _ProcessManager.checkReadyQueue();
                // Reset the scheduler counter
                _Scheduler.unwatch();
            }
            // If there is a blue screen of death, spin the entire screen like cray cray
            if (this.bsod) {
                TSOS.Control.crazySpin();
            }
            // Update the CPU display
            // Control.hostCPU();
            // Update the memory display
            // Control.hostMemory();
        };
        //
        // Interrupt Handling
        //
        Kernel.prototype.krnEnableInterrupts = function () {
            // Keyboard
            TSOS.Devices.hostEnableKeyboardInterrupt();
            // Put more here.
        };
        Kernel.prototype.krnDisableInterrupts = function () {
            // Keyboard
            TSOS.Devices.hostDisableKeyboardInterrupt();
            // Put more here.
        };
        Kernel.prototype.krnInterruptHandler = function (irq, params) {
            // This is the Interrupt Handler Routine.  See pages 8 and 560.
            // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on. Page 766.
            this.krnTrace("Handling IRQ~" + irq);
            // Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
            // TODO: Consider using an Interrupt Vector in the future.
            // Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.
            //       Maybe the hardware simulation will grow to support/require that in the future.
            switch (irq) {
                case TIMER_IRQ:
                    this.krnTimerISR(); // Kernel built-in routine for timers (not the clock).
                    break;
                case KEYBOARD_IRQ:
                    _krnKeyboardDriver.isr(params); // Kernel mode device driver
                    _StdIn.handleInput();
                    break;
                case PROCESS_EXIT:
                    // Reset the scheduler's counter
                    _Scheduler.unwatch();
                    _ProcessManager.exitProcess(params);
                    // Update the processes display
                    TSOS.Control.hostProcesses();
                    // Update the CPU display
                    TSOS.Control.hostCPU();
                    break;
                case CONTEXT_SWITCH:// Placeholder for context switching. We only update the PCB when there is a context switch!!!
                    _Scheduler.contextSwitch();
                    break; // Therefore, in project 2, the PCB for the running process is never updated!!!
                case CONSOLE_WRITE_IR:
                    _StdOut.putText(params);
                    break;
                case BOUNDS_ERROR:
                    _StdOut.putText("Out of bounds error in process " + _ProcessManager.running.Pid + ". Exiting that process...");
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                case INVALID_OP:
                    _StdOut.putText("Invalid op code in process " + _ProcessManager.running.Pid + ". Exiting that process...");
                    _StdOut.advanceLine();
                    _OsShell.putPrompt();
                    break;
                default:
                    this.krnTrapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
                    _StdOut.putText("RIP IN POTATOES UR OPERATING SYSTEM IS DED L0L");
                    this.bsod = true;
            }
        };
        Kernel.prototype.krnTimerISR = function () {
            // The built-in TIMER (not clock) Interrupt Service Routine (as opposed to an ISR coming from a device driver). {
            // Check multiprogramming parameters and enforce quanta here. Call the scheduler / context switch here if necessary.
        };
        //
        // System Calls... that generate software interrupts via tha Application Programming Interface library routines.
        //
        // Some ideas:
        // - ReadConsole
        // - WriteConsole
        // - CreateProcess
        // - ExitProcess
        // - WaitForProcessToExit
        // - CreateFile
        // - OpenFile
        // - ReadFile
        // - WriteFile
        // - CloseFile
        //
        // OS Utility Routines
        //
        Kernel.prototype.krnTrace = function (msg) {
            // Check globals to see if trace is set ON.  If so, then (maybe) log the message.
            if (_Trace) {
                if (msg === "Idle") {
                    // We can't log every idle clock pulse because it would lag the browser very quickly.
                    if (_OSclock % 10 == 0) {
                        // Check the CPU_CLOCK_INTERVAL in globals.ts for an
                        // idea of the tick rate and adjust this line accordingly.
                        TSOS.Control.hostLog(msg, "OS");
                    }
                }
                else {
                    TSOS.Control.hostLog(msg, "OS");
                }
            }
        };
        Kernel.prototype.krnTrapError = function (msg) {
            TSOS.Control.hostLog("OS ERROR - TRAP: " + msg);
            // TODO: Display error on console, perhaps in some sort of colored screen. (Maybe blue?)
            this.krnShutdown();
        };
        return Kernel;
    }());
    TSOS.Kernel = Kernel;
})(TSOS || (TSOS = {}));
