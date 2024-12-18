let ws = null;
let wsUrl = '';
let clientId = '';
let targetId = '';
let wrongAnswerCount = 0;
const MAX_PUNISHMENT_LEVEL = 5;
let channelStrength = { A: 0, B: 0 };
let softLimits = { A: 0, B: 0 };

// 在文件开头添加
const PUNISHMENT_CONFIGS = [
    { strength: 20, duration: 3, wave: "1" },    // 级别 1: 3秒
    { strength: 35, duration: 5, wave: "1" },    // 级别 2: 5秒
    { strength: 50, duration: 8, wave: "2" },    // 级别 3: 8秒
    { strength: 65, duration: 10, wave: "2" },   // 级别 4: 10秒
    { strength: 80, duration: 15, wave: "3" }    // 级别 5: 15秒
];

// 在文件开头添加
const waveData = {
    "1": `["0A0A0A0A00000000","0A0A0A0A0A0A0A0A","0A0A0A0A14141414","0A0A0A0A1E1E1E1E","0A0A0A0A28282828","0A0A0A0A32323232","0A0A0A0A3C3C3C3C","0A0A0A0A46464646","0A0A0A0A50505050","0A0A0A0A5A5A5A5A","0A0A0A0A64646464"]`,
    "2": `["0A0A0A0A00000000","0D0D0D0D0F0F0F0F","101010101E1E1E1E","1313131332323232","1616161641414141","1A1A1A1A50505050","1D1D1D1D64646464","202020205A5A5A5A","2323232350505050","262626264B4B4B4B","2A2A2A2A41414141"]`,
    "3": `["4A4A4A4A64646464","4545454564646464","4040404064646464","3B3B3B3B64646464","3636363664646464","3232323264646464","2D2D2D2D64646464","2828282864646464","2323232364646464","1E1E1E1E64646464","1A1A1A1A64646464"]`
};

// 在文件开头添加波形设置的存储
let channelWaves = {
    A: "1",  // 默认使用轻度波形
    B: "1"
};

// 添加脉冲状态
let isPulsing = false;

// 添加一个直接设置强度的函数
function setStrength(strengthA, strengthB) {
    // 确保不超过软上限
    channelStrength.A = Math.min(strengthA, softLimits.A || 100);
    channelStrength.B = Math.min(strengthB, softLimits.B || 100);

    // 发送新的强度设置
    const strengthMsgA = {
        type: 4,
        message: `strength-1+2+${channelStrength.A}`
    };
    sendWsMessage(strengthMsgA);

    const strengthMsgB = {
        type: 4,
        message: `strength-2+2+${channelStrength.B}`
    };
    sendWsMessage(strengthMsgB);

    broadcastStatus();
}

// 修改 executePunishment 函数
function executePunishment() {
    isInPunishment = true;
    console.log('[Background] 开始执行惩罚');
    wrongAnswerCount++;

    // 直接使用 wrongAnswerCount 作为级别，但不超过最大级别
    const level = Math.min(wrongAnswerCount, MAX_PUNISHMENT_LEVEL) - 1;
    const config = PUNISHMENT_CONFIGS[level];

    console.log('[Background] 当前惩罚配置:', {
        wrongAnswerCount,
        level: level + 1,
        config
    });

    // 计算惩罚增加的强度差值
    const strengthDiffA = Math.min(config.strength,softLimits.A) - channelStrength.A;
    const strengthDiffB = Math.min(config.strength,softLimits.B) - channelStrength.B;
    // 直接设置惩罚强度
    setStrength(config.strength, config.strength);

    // 在惩罚结束后减去增加的强度
    setTimeout(() => {
        console.log('[Background] 惩罚结束，减去惩罚增加的强度:', {
            strengthDiffA,
            strengthDiffB
        });
        // 使用 adjustStrength 减去增加的强度
        setStrength(channelStrength.A - strengthDiffA, channelStrength.B - strengthDiffB);
        isInPunishment = false;
    }, config.duration * 1000);
}

// 发送消息的辅助函数
function sendWsMessage(messageObj) {
    console.log('[Background] 尝试发送WebSocket消息:', messageObj);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('[Background] WebSocket未连接');
        return;
    }

    if (!targetId) {
        console.error('[Background] 未绑定设备');
        return;
    }

    messageObj.clientId = clientId;
    messageObj.targetId = targetId;
    if (!messageObj.hasOwnProperty('type')) {
        messageObj.type = "msg";
    }

    const finalMessage = JSON.stringify(messageObj);
    console.log('[Background] 发送最终消息:', finalMessage);
    ws.send(finalMessage);
}

// 从 storage 加载保存的 ID
chrome.storage.local.get(['clientId', 'targetId'], function (result) {
    if (result.clientId) clientId = result.clientId;
    if (result.targetId) targetId = result.targetId;
});

// 创建 WebSocket 连接
function connectWebSocket() {
    if (!wsUrl) {
        console.log('[WebSocket] 未设置WebSocket地址，无法连接');
        return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) return;

    if (ws) {
        ws.close();
        ws = null;
    }

    ws = new WebSocket(wsUrl);

    ws.onopen = function () {
        console.log('[WebSocket] 连接成功建立');
        broadcastStatus();
    };

    ws.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'bind') {
                clientId = data.clientId;
                targetId = data.targetId;
                chrome.storage.local.set({
                    clientId: clientId,
                    targetId: targetId
                });
                broadcastStatus();
            }
            else if (data.type === 'msg' && data.message.startsWith('strength-')) {
                const [cmd, params] = data.message.split('-');
                const [strengthA, strengthB, softLimitA, softLimitB] = params.split('+').map(Number);
                channelStrength.A = strengthA;
                channelStrength.B = strengthB;
                softLimits.A = softLimitA;
                softLimits.B = softLimitB;
                console.log('[Background] 来自设备的更新强度和软限制:', {
                    A: channelStrength.A,
                    B: channelStrength.B,
                    softLimits: softLimits
                });
                broadcastStatus();
            }
        } catch (e) {
            console.error('[WebSocket] 解析消息失败:', e);
        }
    };

    ws.onclose = function () {
        console.log('[WebSocket] 连接已关闭');
        ws = null;
        setTimeout(connectWebSocket, 3000);
        broadcastStatus();
    };

    ws.onerror = function (error) {
        console.error('[WebSocket] 错误:', error);
        broadcastStatus();
    };
}

// 广播状态更新给所有活动的 popup
function broadcastStatus() {
    const status = {
        wsConnected: ws && ws.readyState === WebSocket.OPEN,
        clientId: clientId,
        targetId: targetId,
        channelStrength: channelStrength,
        softLimits: softLimits,
        channelWaves: channelWaves,
        isPulsing: isPulsing  // 添加脉冲状态
    };

    chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        status: status
    }).catch(() => { });

    chrome.tabs.query({}, function (tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'STRENGTH_UPDATE',
                strength: channelStrength
            }).catch(() => { });
        });
    });
}

// 初始连接
console.log('[Background] Service Worker 启动');

// 在初始化时加载保存的 WebSocket 地址
chrome.storage.local.get(['wsUrl'], function (result) {
    if (result.wsUrl) {
        wsUrl = result.wsUrl;
        console.log('[Background] 从storage加载WebSocket地址:', wsUrl);
        // 只有在有保存的地址时才连接
        connectWebSocket();
    } else {
        console.log('[Background] 未找到保存的WebSocket地址，等待用户设置');
        // 广播初始状态
        broadcastStatus();
    }
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Background] 收到消息:', message, '来自:', sender);

    if (message.type === 'GET_STATUS') {
        const status = {
            wsConnected: ws && ws.readyState === WebSocket.OPEN,
            clientId: clientId,
            targetId: targetId,
            channelStrength: channelStrength,
            softLimits: softLimits,
            channelWaves: channelWaves,
            isPulsing: isPulsing  // 添加这行
        };
        console.log('[Background] 发送状态:', status);
        sendResponse(status);
    }
    else if (message.type === 'RECONNECT') {
        console.log('[Background] 收到重连请求');
        connectWebSocket();
        sendResponse({ status: 'reconnecting' });
    }
    // else if (message.type === 'WRONG_ANSWER') {
    //     console.log('[Background] 收到错误答案通知');
    //     executePunishment();
    //     sendResponse({
    //         status: 'punishment_executed',
    //         level: wrongAnswerCount,
    //         timestamp: new Date().toISOString()
    //     });
    // }
    // else if (message.type === 'REWARD') {
    //     console.log('[Background] 收到奖励请求');
    //     adjustStrength(-message.amount);  // 用负数来减少强度
    //     sendResponse({ status: 'reward_executed' });
    // }
    else if (message.type === 'UPDATE_WS_URL') {
        const newUrl = message.url;
        if (!newUrl) {
            console.log('[Background] 收到空的WebSocket地址');
            sendResponse({ status: 'error', message: '地址不能为空' });
            return;
        }
        console.log('[Background] 更新WebSocket地址:', newUrl);
        wsUrl = newUrl;
        // 如果当前有连接，先断开
        if (ws) {
            ws.close();
            ws = null;
        }
        // 建立新连接
        connectWebSocket();
        sendResponse({ status: 'url_updated' });
    }
    else if (message.type === 'SET_CHANNEL_STRENGTH') {
        const { channel, strength } = message;
        // 更新强度记录
        channelStrength[channel] = strength;

        // 发送强度设置
        const strengthMsg = {
            type: 4,
            message: `strength-${channel === 'A' ? '1' : '2'}+2+${strength}`
        };
        sendWsMessage(strengthMsg);

        // 广播状态更新
        broadcastStatus();
        sendResponse({ status: 'strength_updated' });
    }
    else if (message.type === 'SET_CHANNEL_WAVE') {
        const { channel, wave } = message;
        channelWaves[channel] = wave;
        console.log(`[Background] 保存${channel}通道波形设置:`, wave);

        // 如果正在脉冲，立即应用新波形
        if (isPulsing) {
            // 清空通道
            const clearMsg = {
                type: 4,
                message: `clear-${channel === 'A' ? '1' : '2'}`
            };
            sendWsMessage(clearMsg);

            // 重新发送脉冲
            setTimeout(() => {
                const waveMsg = {
                    type: "clientMsg",
                    message: `${channel}:${waveData[wave]}`,
                    time: 60,
                    channel: channel
                };
                sendWsMessage(waveMsg);
            }, 100);
        }

        sendResponse({ status: 'wave_saved' });
    }
    else if (message.type === 'INCREASE_STRENGTH') {
        adjustStrength(message.amount);
    }
    // else if (message.type === 'REWARD') {
    //     adjustStrength(-message.amount);  // 注意这里是负数
    //     sendResponse({ status: 'reward_executed' });
    // }
    else if (message.type === 'START_PULSE') {
        isPulsing = true;
        broadcastStatus();  // 广播新状态
        setTimeout(() => {
            // 使用当前保存的波形发送数据
            const waveDataA = {
                type: "clientMsg",
                message: `A:${waveData[channelWaves.A]}`,
                time: 60,
                channel: "A"
            };
            sendWsMessage(waveDataA);

            const waveDataB = {
                type: "clientMsg",
                message: `B:${waveData[channelWaves.B]}`,
                time: 60,
                channel: "B"
            };
            sendWsMessage(waveDataB);
        }, 100);
    }
    else if (message.type === 'DISCONNECT') {
        isPulsing = false;  // 停止脉冲状态
        if (ws) {
            ws.close();
            ws = null;
        }
        broadcastStatus();
    }

    return true;  // 保持消息通道开放
});

// 添加强度调整函数
function adjustStrength(amount) {
    if (amount > 0) {
        // 增加强度，但不超过软上限
        channelStrength.A = Math.min(channelStrength.A + amount, softLimits.A || 100);
        channelStrength.B = Math.min(channelStrength.B + amount, softLimits.B || 100);
    } else {
        // 减少强度
        channelStrength.A = Math.max(channelStrength.A + amount, 0);
        channelStrength.B = Math.max(channelStrength.B + amount, 0);
    }
    setStrength(channelStrength.A, channelStrength.B);
}

// 跟踪上次fetch时间
let lastFetchTime = 0;
const FETCH_INTERVAL = 5000;  // 5秒间隔

// 修改监听器
chrome.webRequest.onCompleted.addListener(
    function (details) {
        if (details.method === "GET" && details.url.includes('check')) {
            const now = Date.now();
            
            // 如果距离上次fetch不足5秒，忽略这次check
            if (now - lastFetchTime < FETCH_INTERVAL) {
                console.log('[Background] 忽略5秒内的重复检查');
                return;
            }

            // 记录这次fetch的时间
            lastFetchTime = now;
            
            // 发送fetch请求并处理结果
            function checkSubmission() {
                fetch(details.url)
                    .then(response => response.json())
                    .then(data => {
                        console.log('[Background] 检查结果:', data);
                        
                        // 如果还在进行中，等待后重试
                        if (data.state === "STARTED") {
                            console.log('[Background] 提交仍在进行中，1秒后重试');
                            setTimeout(checkSubmission, 1000);
                            return;
                        }

                        // 处理最终结果
                        if (data.run_success === false) {
                            console.log('[Background] 检测到提交失败');
                            executePunishment();
                            // 发送消息给 content 显示提示
                            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                                if (tabs[0]) {
                                    chrome.tabs.sendMessage(tabs[0].id, { 
                                        type: 'SHOW_NOTIFICATION',
                                        notificationType: 'PUNISHMENT',
                                    });
                                }
                            });
                        } else if (data.run_success === true) {
                            console.log('[Background] 检测到提交成功');
                            adjustStrength(-10);
                            // 发送消息给 content 显示提示
                            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                                if (tabs[0]) {
                                    chrome.tabs.sendMessage(tabs[0].id, { 
                                        type: 'SHOW_NOTIFICATION',
                                        notificationType: 'REWARD',
                                    });
                                }
                            });
                        }
                    })
                    .catch(e => {
                        console.error('[Background] 解析响应失败:', e);
                    });
            }

            // 开始检查
            checkSubmission();
        }
    },
    {
        urls: ["https://leetcode.cn/submissions/detail/*/check/"]
    }
);

// 添加 webNavigation 监听器
chrome.webNavigation.onCommitted.addListener((details) => {
    // 只处理主框架的导航事件
    if (details.frameId === 0 && details.url.includes('leetcode.cn')) {
        // 通过 transitionType 和 transitionQualifiers 判断是否是用户刷新
        const isRefresh = details.transitionType === 'reload' || 
                         details.transitionQualifiers.includes('client_redirect');
        
        if (isRefresh) {
            console.log('[Background] 用户刷新了 LeetCode 页面，重置错误计数');
            wrongAnswerCount = 0;
        }
        setStrength(0, 0);
    }
});