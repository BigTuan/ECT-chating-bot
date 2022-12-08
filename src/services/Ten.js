let currentState

if (currentState === undefined) {
    currentState = []
}

function getCurrentState(psid) {
    if (!currentState[psid]) {
        currentState[psid] = 0
    }

    return currentState[psid]
}

function setState(psid, state) {
    currentState[psid] = state
}

module.exports = {
    getCurrentState,
    setState
}