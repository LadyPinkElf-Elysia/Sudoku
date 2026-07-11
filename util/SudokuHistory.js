// util/SudokuHistory.js
export class SudokuHistory {
    static push(historyMap, stepPointer, gridSnapshot) {
        stepPointer++;
        const newSnapshot = gridSnapshot.map(row => [...row]);
        const newMap = { ...historyMap, [stepPointer]: newSnapshot };
        const keys = Object.keys(newMap).map(Number);
        for (let key of keys) {
            if (key > stepPointer) delete newMap[key];
        }
        return { newStepPointer: stepPointer, newHistoryMap: newMap };
    }

    static goTo(historyMap, targetStep) {
        if (!historyMap[targetStep]) return null;
        return { targetStep, targetGrid: historyMap[targetStep] };
    }
}