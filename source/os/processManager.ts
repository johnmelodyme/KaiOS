/* ------------
   processManager.ts

   This is the client OS implementation of a process manager.
   This is responsible for keeping track of all the processes in the OS,
   as well as creating, saving, and exiting them.
   PROJECT 2: NOT UPDATING PCB BECAUSE WE NEVER DO A CONTEXT SWITCH.
   ------------ */

   module TSOS {
    export class ProcessManager {

        constructor(public residentQueue: any,
                    public readyQueue: any,
                    public running: TSOS.ProcessControlBlock) {     // Keeps track of running PCB
            this.residentQueue = new Queue();                       // Where we load the program into memory, where it waits to be run.
            this.readyQueue = new Queue();                          // Where a program is put when marked for CPU to move its program counter forward.
        }

        public createProcess(opcodes): void {
            // Check to see if there is an available partition in memory to put program in.
            // Make sure the program can fit into that partition
            // If there is no available memory, then display appropriate output to the user.
            if(_MemoryManager.checkMemory(opcodes.length)){
                let pcb = new ProcessControlBlock(_Pid);
                // Have the memory manager load the new program into memory.
                // We have to get an available partition in memory and load the program into there.
                var partition = _MemoryManager.getFreePartition(opcodes.length);
                pcb.init(partition);
                // Put the new PCB onto the resident queue where it waits for CPU time
                this.residentQueue.enqueue(pcb);
                _MemoryManager.loadIntoMemory(opcodes, partition);
                _StdOut.putText("Program loaded in memory with process ID " + _Pid);
                _Pid++;
            }
            else{
                _StdOut.putText("Loading of program failed! No memory available.");
            }
        }

        // This exits a process from the CPU. Let's just call CPU.init() to reset it, which will
        // set isExecuting to false and all registers to 0.
        // We also need to reset the memory partition the process was running in. Look in PCB to see which partition to reset
        // We also need to remove the process from the ready queue display
        // We also need to update the CPU and memory display
        public exitProcess(): void {
            _CPU.init();
            _MemoryManager.clearMemoryPartition(this.running.Partition);
            this.running = null;
            Control.hostProcesses();
            // Control.hostCPU();
            // Control.hostMemory();
        }

        // On each clock pulse, check to see if there is anything in the ready queue.
        // If so, make the CPU run user process.
        public checkReadyQueue(): void {
            if(!this.readyQueue.isEmpty()){
                this.runProcess();
            }
            else{
                _CPU.isExecuting = false;
            }
        }
        
        // This runs a process that is stored in memory
        public runProcess(): void {
            // Take a PCB off the ready queue, and set the CPU to its info.
            // Starts the CPU executing by setting isExecuting to true.
            this.running = this.readyQueue.dequeue();
            // Put all stuff from PCB to CPU
            _CPU.PC = this.running.PC;
            _CPU.Acc = this.running.Acc;
            _CPU.Xreg = this.running.Xreg;
            _CPU.Yreg = this.running.Yreg;
            _CPU.Zflag = this.running.Zflag;
            _CPU.isExecuting = true;
            // Set the PCB status to running
            this.running.State = "Running";
            // Update the display for the PCB
            Control.hostProcesses();
            // Update the CPU display as well
            Control.hostCPU();
            // Update the memory as well
            Control.hostMemory();
        }

        // This checks if a process is running
        public isRunning(): boolean {
            return this.running != null;
        }

        // For now, we don't do context switching.
        // Therefore, the PCB will never get updated
        public contextSwitch(): void {
            // placeholder for later
            // most likely will implement a scheduler.ts
        }
    }
}
