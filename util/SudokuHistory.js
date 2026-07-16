// SudokuHistory.js - 历史记录管理（单一职责）
export class SudokuHistory {
    // 推入新状态
    static push(historyMap, stepPointer, gridSnapshot) {
        stepPointer++;
        const newSnapshot = gridSnapshot.map(row => [...row]);
        const newMap = { ...historyMap, [stepPointer]: newSnapshot };
        // 删除当前步骤之后的所有状态
        const keys = Object.keys(newMap).map(Number);
        for (let key of keys) {
            if (key > stepPointer) delete newMap[key];
        }
        return { newStepPointer: stepPointer, newHistoryMap: newMap };
    }

    // 跳转到指定步骤
    static goTo(historyMap, targetStep) {
        if (!historyMap[targetStep]) return null;
        return { targetStep, targetGrid: historyMap[targetStep] };
    }
}