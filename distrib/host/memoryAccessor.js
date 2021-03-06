///<reference path="../globals.ts" />
///<reference path="../os/interrupt.ts" />
/* ------------
     memoryAccesor.ts

     Requires global.ts.

     Does memory translation and enforces memory out of bounds issues.

     Routines for the host memory accessor simulation, NOT for the OS itself.
     In this manner, it's A LITTLE BIT like a hypervisor,
     in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
     that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
     TypeScript/JavaScript in both the host and client environments.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */
var TSOS;
(function (TSOS) {
    var MemoryAccessor = /** @class */ (function () {
        function MemoryAccessor() {
        }
        // This reads the memory based on a given address in memory
        // Returns the hex string value stored in memory
        // Enforce memory out of bounds rule
        // Also do address translation!
        MemoryAccessor.prototype.readMemory = function (addr) {
            if (this.inBounds(addr)) {
                var partition = _ProcessManager.running.Partition;
                return _Memory.memoryArray[_MemoryManager.partitions[partition].base + addr].toString();
            }
            else {
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(BOUNDS_ERROR, 0));
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(PROCESS_EXIT, false));
            }
        };
        // This writes to memory based on an address and value given
        // Enforce memory out of bounds rule
        // Also do address translation!
        MemoryAccessor.prototype.writeMemory = function (addr, value) {
            if (this.inBounds(addr)) {
                if (parseInt(value, 16) < 16) {
                    value = "0" + value;
                }
                var partition = _ProcessManager.running.Partition;
                _Memory.memoryArray[_MemoryManager.partitions[partition].base + addr] = value;
            }
            else {
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(BOUNDS_ERROR, 0));
                _KernelInterruptQueue.enqueue(new TSOS.Interrupt(PROCESS_EXIT, false));
            }
        };
        // Checks to make sure the memory being accessed is within the range specified by the base/limit
        // Do address translation based on PCB being run
        MemoryAccessor.prototype.inBounds = function (addr) {
            var partition = _ProcessManager.running.Partition;
            if (addr + _MemoryManager.partitions[partition].base < _MemoryManager.partitions[partition].base + _MemoryManager.partitions[partition].limit && addr + _MemoryManager.partitions[partition].base >= _MemoryManager.partitions[partition].base) {
                return true;
            }
            else {
                return false;
            }
        };
        // Loops address and enforces base/limit constraints
        MemoryAccessor.prototype.bneLoop = function (pc, branch) {
            return (pc + branch + 2) % _MemoryManager.getLimitRegister(_ProcessManager.running.Partition);
        };
        return MemoryAccessor;
    }());
    TSOS.MemoryAccessor = MemoryAccessor;
})(TSOS || (TSOS = {}));
