///<reference path="../globals.ts" />
///<reference path="../os/canvastext.ts" />
///<reference path="./cpu.ts" />
///<reference path="./memory.ts" />
///<reference path="./memoryAccessor.ts" />
///<reference path="./devices.ts" />
///<reference path="../os/kernel.ts" />
///<reference path="./disk.ts" />

/* ------------
     Control.ts

     Requires globals.ts.

     Routines for the hardware simulation, NOT for our client OS itself.
     These are static because we are never going to instantiate them, because they represent the hardware.
     In this manner, it's A LITTLE BIT like a hypervisor, in that the Document environment inside a browser
     is the "bare metal" (so to speak) for which we write code that hosts our client OS.
     But that analogy only goes so far, and the lines are blurred, because we are using TypeScript/JavaScript
     in both the host and client environments.

     This (and other host/simulation scripts) is the only place that we should see "web" code, such as
     DOM manipulation and event handling, and so on.  (Index.html is -- obviously -- the only place for markup.)

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

//
// Control Services
//
module TSOS {

    export class Control {

        public static rotate = 0;      // Used for rotating the background

        public static hostInit(): void {
            // This is called from index.html's onLoad event via the onDocumentLoad function pointer.

            // Get a global reference to the canvas.  TODO: Should we move this stuff into a Display Device Driver?
            _Canvas = <HTMLCanvasElement>document.getElementById('display');

            // Get a global reference to the drawing context.
            _DrawingContext = _Canvas.getContext("2d");

            // Enable the added-in canvas text functions (see canvastext.ts for provenance and details).
            CanvasTextFunctions.enable(_DrawingContext);   // Text functionality is now built in to the HTML5 canvas. But this is old-school, and fun, so we'll keep it.

            // Clear the log text box.
            // Use the TypeScript cast to HTMLInputElement
            (<HTMLInputElement> document.getElementById("taHostLog")).value="";

            // Set focus on the start button.
            // Use the TypeScript cast to HTMLInputElement
            (<HTMLInputElement> document.getElementById("btnStartOS")).focus();

            // Check for our testing and enrichment core, which
            // may be referenced here (from index.html) as function Glados().
            if (typeof Glados === "function") {
                // function Glados() is here, so instantiate Her into
                // the global (and properly capitalized) _GLaDOS variable.
                _GLaDOS = new Glados();
                _GLaDOS.init();
            }
        }

        public static hostLog(msg: string, source: string = "?"): void {
            // Note the OS CLOCK.
            var clock: number = _OSclock;

            // Note the REAL clock in milliseconds since January 1, 1970.
            var now: number = new Date().getTime();

            // Build the log string.
            var str: string = "({ clock:" + clock + ", source:" + source + ", msg:" + msg + ", now:" + now  + " })"  + "\n";

            // Update the log console.
            var taLog = <HTMLInputElement> document.getElementById("taHostLog");
            taLog.value = str + taLog.value;
            
            //Updating the taskbar
            var dateTime = new Date().toLocaleString();
            document.getElementById("taskBar").innerHTML = "<h6>" + dateTime + " | " + _UserStatus + "</h6>";

            // TODO in the future: Optionally update a log database or some streaming service.
        }

        // This will update and display the CPU in real time
        public static hostCPU(): void {
            var table = (<HTMLTableElement>document.getElementById('tableCPU'));
            table.deleteRow(-1);
            var row = table.insertRow(-1); // New row appended to table
            // PC
            var cell = row.insertCell();
            cell.innerHTML = _CPU.PC.toString(16).toUpperCase();
            // IR
            cell = row.insertCell();
            if(_CPU.isExecuting){
                cell.innerHTML = _Memory.memoryArray[_CPU.PC].toString(); 
            }
            else{
                cell.innerHTML = "0";
            }
            // Acc
            cell = row.insertCell();
            cell.innerHTML = _CPU.Acc.toString(16).toUpperCase();
            // Xreg
            cell = row.insertCell();
            cell.innerHTML = _CPU.Xreg.toString(16).toUpperCase();
            // Yreg
            cell = row.insertCell();
            cell.innerHTML = _CPU.Yreg.toString(16).toUpperCase();
            // Zflag
            cell = row.insertCell();
            cell.innerHTML = _CPU.Zflag.toString(16).toUpperCase();
        }

        // This will update and display the memory in real time
        public static hostMemory(): void {
            var table = (<HTMLTableElement>document.getElementById('tableMemory'));
            var memoryPtr = 0;
            for(var i=0; i<table.rows.length; i++){
                for(var j=1; j<9; j++){
                    table.rows[i].cells.item(j).innerHTML = _Memory.memoryArray[memoryPtr].toString().toUpperCase();
                    table.rows[i].cells.item(j).style.color = "black"; 
                    table.rows[i].cells.item(j).style['font-weight'] = "normal";
                    // Check to see if the hex needs a leading zero.
                    // If it does, then convert the hex to decimal, then back to hex, and add a leading zero.
                    // We do that seemingly dumb step because if the value stored in memory already has a leading 0, will make display look gross.
                    var dec = parseInt(_Memory.memoryArray[memoryPtr].toString(), 16);
                    if(dec < 16 && dec > 0){
                        table.rows[i].cells.item(j).innerHTML = "0" + dec.toString(16).toUpperCase();
                    }
                    memoryPtr++;
                }
            }
            // Color the instruction that is being executed by the CPU
            if(_CPU.isExecuting){
                var index = _CPU.PC + _MemoryManager.partitions[_ProcessManager.running.Partition].base;
                this.colorMemory(table, index, "bold");
                // Color the bytes of memory the instruction is referring to
                // This stores the number of bytes the opcode refers to after itself in memory
                var instructionMem = {
                    "A9":1,
                    "AD":2,
                    "8D":2,
                    "6D":2,
                    "A2":1,
                    "AE":2,
                    "A0":1,
                    "AC":2,
                    "EA":0,
                    "00":0,
                    "EC":2,
                    "D0":1,
                    "EE":2,
                    "FF":0
                }
                var opCode = _Memory.memoryArray[_CPU.PC].toString();
                for(var i=1; i<=instructionMem[opCode]; i++){
                    this.colorMemory(table, index+i, "normal");
                }
            }
        }
        
        // Helper method to color memory
        private static colorMemory(table, index, weight): void {
            var row = Math.floor(index / (table.rows[0].cells.length-1));   // Gets the row the address is in
            var col = (index % (table.rows[0].cells.length-1))+1;           // Gets the column the address is in
            if(weight == "bold"){
                table.rows[row].cells.item(col).style = "color: blue; font-weight: bold";
            }
            else{
                table.rows[row].cells.item(col).style = "color: blue;";
            }
            // Scroll to that part of the table
            table.rows[row].cells.item(col).scrollIntoView(false);
        }

        // This will update and display the processes in execution in the ready queue display
        public static hostProcesses(): void {
            // Show scheduling algorithm
            var scheduleName = (<HTMLTableElement>document.getElementById('scheduleName'));
            scheduleName.innerHTML = _Scheduler.algorithm.toUpperCase();
            if(_Scheduler.algorithm == ROUND_ROBIN){
                scheduleName.innerHTML = "ROUND ROBIN";
            }
            var table = (<HTMLTableElement>document.getElementById('tableReady'));
            // For each PCB in ready queue, print out a new row for it
            let readyQueue: Array<ProcessControlBlock> = [];
            /*for(var i=0; i<_ProcessManager.readyQueue.getSize(); i++){
                // Yay, let's violate the queue structure so we can display it properly!!!
                var pcb = _ProcessManager.readyQueue.q[i];
                readyQueue.push(pcb);
            }*/
            // Following queue structure convention could potentially mess things up
            // if something else i.e. the scheduler accesses the ready queue between the
            // dequeuing and enqueuing process below...proceed with caution
            for(var i=0; i<_ProcessManager.readyQueue.getSize(); i++){
                var pcb = _ProcessManager.readyQueue.dequeue();
                _ProcessManager.readyQueue.enqueue(pcb);
                readyQueue.push(pcb);
            }
            if(_ProcessManager.running != null){
                readyQueue.push(_ProcessManager.running);
            }
            while(table.rows.length > 1){
                table.deleteRow(1);
            }
            // Display all the other PCBs sitting in the ready queue
            // Convert numbers to HEX
            while(readyQueue.length > 0){
                var displayPcb = readyQueue.pop();
                var row = table.insertRow(-1); // New row appended to table
                // PID
                var cell = row.insertCell();
                cell.innerHTML = displayPcb.Pid.toString(16).toUpperCase();
                // State
                cell = row.insertCell();
                cell.innerHTML = displayPcb.State;
                // PC
                cell = row.insertCell();
                cell.innerHTML = displayPcb.PC.toString(16).toUpperCase();
                // IR
                cell = row.insertCell();
                cell.innerHTML = displayPcb.IR.toString();
                // Acc
                cell = row.insertCell();
                cell.innerHTML = displayPcb.Acc.toString(16).toUpperCase();
                // Xreg
                cell = row.insertCell();
                cell.innerHTML = displayPcb.Xreg.toString(16).toUpperCase();
                // Yreg
                cell = row.insertCell();
                cell.innerHTML = displayPcb.Yreg.toString(16).toUpperCase();
                // Zflag
                cell = row.insertCell();
                cell.innerHTML = displayPcb.Zflag.toString(16).toUpperCase();
            }
        }

        public static initMemoryDisplay(): void {
            var table = (<HTMLTableElement>document.getElementById('tableMemory'));
            // We assume each row will hold 8 memory values
            for(var i=0; i<_Memory.memoryArray.length/8; i++){
                var row = table.insertRow(i);
                var memoryAddrCell = row.insertCell(0);
                var address = i*8;
                // Display address in proper memory hex notation
                // Adds leading 0s if necessary
                var displayAddress = "0x";
                for(var k=0; k<3-address.toString(16).length; k++){
                    displayAddress += "0";
                }
                displayAddress += address.toString(16).toUpperCase();
                memoryAddrCell.innerHTML = displayAddress;
                // Fill all the cells with 00s
                for(var j=1; j<9; j++){
                    var cell = row.insertCell(j);
                    cell.innerHTML = "00";
                    cell.classList.add("memoryCell");
                }
            }
        }

        // This will update the disk display with contents of session storage
        public static hostDisk(): void {
            var table = (<HTMLTableElement>document.getElementById('tableDisk'));
            // Remove all rows
            let rows = table.rows.length;
            for(var i=0; i<rows; i++){
                table.deleteRow(0);
            }
            let rowNum = 0;
            // firefox sucks and doesn't keep session storage in order
            // For each row, insert the TSB, available bit, pointer, and data into separate cells
            for(var trackNum=0; trackNum<_Disk.numOfTracks; trackNum++){
                for(var sectorNum=0; sectorNum<_Disk.numOfSectors; sectorNum++){
                    for(var blockNum=0; blockNum<_Disk.numOfBlocks; blockNum++){
                        // generate proper tsb id since firefox sucks and doesn't keep session storage ordered
                        var tsbID = trackNum + ":" + sectorNum + ":" + blockNum;
                        var row = table.insertRow(rowNum);
                        rowNum++;
                        row.style.backgroundColor = "white";
                        var tsb = row.insertCell(0);
                        tsb.innerHTML = tsbID;
                        tsb.style.color = "lightcoral";
                        var availableBit = row.insertCell(1);
                        availableBit.innerHTML = JSON.parse(sessionStorage.getItem(tsbID)).availableBit;
                        availableBit.style.color = "lightgreen";
                        var pointer = row.insertCell(2);
                        var pointerVal = JSON.parse(sessionStorage.getItem(tsbID)).pointer;
                        pointer.innerHTML = pointerVal;
                        pointer.style.color = "lightgray";
                        var data = row.insertCell(3);
                        data.innerHTML = JSON.parse(sessionStorage.getItem(tsbID)).data.join("").toString();
                        data.style.color = "lightblue";
                    }
                }
            }
            // // For each row, insert the TSB, available bit, pointer, and data into separate cells
            // for(var i=0; i<_Disk.numOfTracks*_Disk.numOfSectors*_Disk.numOfBlocks; i++){
            //     var row = table.insertRow(i);
            //     row.style.backgroundColor = "white";
            //     var tsb = row.insertCell(0);
            //     tsb.innerHTML = sessionStorage.key(i);
            //     tsb.style.color = "lightcoral";
            //     var availableBit = row.insertCell(1);
            //     availableBit.innerHTML = JSON.parse(sessionStorage.getItem(sessionStorage.key(i))).availableBit;
            //     availableBit.style.color = "lightgreen";
            //     var pointer = row.insertCell(2);
            //     var pointerVal = JSON.parse(sessionStorage.getItem(sessionStorage.key(i))).pointer;
            //     pointer.innerHTML = pointerVal;
            //     pointer.style.color = "lightgray";
            //     var data = row.insertCell(3);
            //     data.innerHTML = JSON.parse(sessionStorage.getItem(sessionStorage.key(i))).data.join("").toString();
            //     data.style.color = "lightblue";
            // }
        }

        public static initDiskDisplay(): void {
            this.hostDisk();
        }

        //
        // Host Events
        //
        public static hostBtnStartOS_click(btn): void {
            // Disable the (passed-in) start button...
            btn.disabled = true;

            // .. enable the Halt and Reset buttons ...
            (<HTMLButtonElement>document.getElementById("btnHaltOS")).disabled = false;
            (<HTMLButtonElement>document.getElementById("btnReset")).disabled = false;
            // .. also enable the single step and next buttons ...
            (<HTMLButtonElement>document.getElementById("btnSingleStep")).disabled = false;

            // .. set focus on the OS console display ...
            document.getElementById("display").focus();

            // ... Create and initialize the CPU (because it's part of the hardware)  ...
            _CPU = new Cpu();  // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
            _CPU.init();       //       There's more to do, like dealing with scheduling and such, but this would be a start. Pretty cool.
            Control.hostCPU(); // Update the CPU display

            // Create and initialize the memory and its display
            _Memory = new Memory();
            _Memory.init();
            Control.initMemoryDisplay();

            // Create the memory accessor
            _MemoryAccessor = new MemoryAccessor();

            // Create the disk
            _Disk = new Disk();
            _Disk.init();
            Control.initDiskDisplay();

            // ... then set the host clock pulse ...
            // _hardwareClockID = setInterval(Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
            setInterval(Devices.hostClockPulse, CPU_CLOCK_INTERVAL);
            // .. and call the OS Kernel Bootstrap routine.
            _Kernel = new Kernel();
            _Kernel.krnBootstrap();  // _GLaDOS.afterStartup() will get called in there, if configured.
        }

        public static hostBtnHaltOS_click(btn): void {
            Control.hostLog("Emergency halt", "host");
            Control.hostLog("Attempting Kernel shutdown.", "host");
            // Call the OS shutdown routine.
            _Kernel.krnShutdown();
            // Stop the interval that's simulating our clock pulse.
            clearInterval(_hardwareClockID);
            // TODO: Is there anything else we need to do here?
        }

        public static hostBtnReset_click(btn): void {
            // The easiest and most thorough way to do this is to reload (not refresh) the document.
            location.reload(true);
            // That boolean parameter is the 'forceget' flag. When it is true it causes the page to always
            // be reloaded from the server. If it is false or not specified the browser may reload the
            // page from its cache, which is not what we want.
        }

        // Triggers single step mode
        public static hostBtnSingleStep_click(btn): void {
            _SingleStepMode = !_SingleStepMode;
            if(_SingleStepMode){
                (<HTMLButtonElement>document.getElementById("btnSingleStep")).style['background-color'] = "#42f450";
                (<HTMLButtonElement>document.getElementById("btnNextStep")).style['background-color'] = "green !important";
                (<HTMLButtonElement>document.getElementById("btnNextStep")).disabled = false;
            }
            else{
                (<HTMLButtonElement>document.getElementById("btnSingleStep")).style['background-color'] = "#007bff";
                (<HTMLButtonElement>document.getElementById("btnNextStep")).style['background-color'] = "#808080";
                (<HTMLButtonElement>document.getElementById("btnNextStep")).disabled = true;
            }
        }

        // Goes to the next step in single step mode
        public static hostBtnNextStep_click(btn): void {
            _NextStep = true;
        }

        // Do a crazy spin when a BSOD occurs
        public static crazySpin(): void {
            document.getElementsByTagName('head')[0].removeChild(document.getElementsByTagName('head')[0].lastChild);
            var style = document.createElement('style');
            this.rotate += 30;
            style.type = "text/css";
            style.innerHTML = ".derp { transform: rotate(" + this.rotate + "deg); -webkit-transform: rotate(" + this.rotate + "deg); }";
            document.getElementsByTagName('head')[0].appendChild(style);
            document.getElementById("background").classList.add("derp");
        }
    }
}
