import {MemoryService} from "./memoryService.js";

const memoryService = new MemoryService("memories");
await memoryService.storeMemory("Dora is a german shepherd who lives with Bob");
const response = await memoryService.getGetRelevantMemory("Who is Dora?");
console.log(response);