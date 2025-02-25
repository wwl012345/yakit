import React, {useEffect, useState} from "react";
import {
    Alert,
    Badge,
    Button,
    ButtonProps,
    Card,
    Divider,
    Form, Modal, notification,
    Popconfirm, Popover,
    Space,
    Spin,
    Tag,
    Timeline,
    Typography
} from "antd";
import {ExecResult} from "../pages/invoker/schema";
import {showDrawer, showModal} from "./showModal";
import {openExternalWebsite} from "./openWebsite";
import {ExecResultLog, ExecResultMessage} from "../pages/invoker/batch/ExecMessageViewer";
import {LogLevelToCode} from "../components/HTTPFlowTable";
import {YakitLogFormatter} from "../pages/invoker/YakitLogFormatter";
import {InputItem} from "./inputUtil";
import {useGetState, useLatest, useMemoizedFn} from "ahooks";
import {ReloadOutlined} from "@ant-design/icons";
import {getValue, saveValue} from "./kv";
import {BRIDGE_ADDR, BRIDGE_SECRET} from "../pages/reverse/ReverseServerPage";
import {failed, info} from "./notification";
import {RiskTable} from "../pages/risks/RiskTable";
import {YakExecutorParam, YakExecutorParamsProp} from "../pages/invoker/YakExecutorParams";
import useHoldingIPCRStream from "../hook/useHoldingIPCRStream";
import {randomString} from "./randomUtil";
import {PluginResultUI} from "../pages/yakitStore/viewers/base";
import {AutoCard} from "../components/AutoCard";

export interface YakVersionProp {

}

const {ipcRenderer} = window.require("electron");

interface ReverseDetail {
    PublicReverseIP: string
    PublicReversePort: number
    LocalReverseAddr: string
    LocalReversePort: number
}

export const ReversePlatformStatus = React.memo(() => {
    const [ok, setOk] = useState(false)
    const [details, setDetails] = useState<ReverseDetail>({
        LocalReverseAddr: "",
        LocalReversePort: 0,
        PublicReverseIP: "",
        PublicReversePort: 0
    });

    useEffect(() => {
        const update = () => {
            ipcRenderer.invoke("get-global-reverse-server-status").then(setOk)
        }

        let id = setInterval(() => {
            update()
        }, 1000)
        return () => {
            clearInterval(id)
        }
    }, [])

    useEffect(() => {
        if (!ok) {
            setDetails({LocalReverseAddr: "", LocalReversePort: 0, PublicReverseIP: "", PublicReversePort: 0})
            return
        }
    }, [ok])

    useEffect(() => {
        if (details.PublicReverseIP === "") {
            let id = setInterval(() => {
                ipcRenderer.invoke("GetGlobalReverseServer", {}).then((data: ReverseDetail) => {
                    setDetails(data)
                })
            }, 1000)
            return () => {
                clearInterval(id)
            }
        }
    }, [details])

    const flag = (ok && !!details.PublicReverseIP && !!details.PublicReversePort);
    return <Popover visible={ok ? undefined : false} content={<div>
        <Space direction={"vertical"}>
            <Text copyable={true}>{`rmi://${details.PublicReverseIP}:${details.PublicReversePort}`}</Text>
            <Text copyable={true}>{`http://${details.PublicReverseIP}:${details.PublicReversePort}`}</Text>
            <Text copyable={true}>{`https://${details.PublicReverseIP}:${details.PublicReversePort}`}</Text>
        </Space>
    </div>} title={"公网反连配置"}>
        <Tag
            onClick={() => {
                showDrawer({
                    title: "Risk 表 (包含反连)",
                    width: "70%",
                    content: <>
                        <RiskTable/>
                    </>
                })
            }}
            color={flag ? "green" : "red"}
        >{flag
            ? `公网反连:${details.PublicReverseIP}:${details.PublicReversePort}`
            :
            "未配置公网反连"
        }</Tag>
    </Popover>
})

export const callCopyToClipboard = (str: string) => {
    ipcRenderer.invoke("copy-clipboard", str).then(() => {
        info( "Copy Finished")
    })
}

export const YakVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")
    const [latestVersion, setLatestVersion] = useState("");


    useEffect(() => {
        ipcRenderer.invoke("query-latest-yak-version").then((data: string) => {
            setLatestVersion(data)
        }).catch(() => {
        }).finally(
        )

        ipcRenderer.on("client-yak-version", async (e: any, data) => {
            setVersion(data)
        })

        ipcRenderer.invoke("yak-version")
        return () => {
            ipcRenderer.removeAllListeners("client-yak-version")
        }
    }, [])

    if (!version) {
        return <Spin tip={"正在加载 yak 版本"}/>
    }
    const isDev = version.toLowerCase().includes("dev");

    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            Yak-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"}
                    onClick={() => {
                        if (!newVersion) {
                            return
                        }

                        showModal({
                            title: "有新的 Yak 核心引擎可升级！",
                            content: <>
                                如果你现在不是很忙
                                <br/>
                                我们推荐您退出当前引擎，点击欢迎界面的
                                <br/>
                                "安装/升级 Yak 引擎" 来免费升级
                            </>
                        })
                    }}>
                Yak-{version}
            </Button>
        </Badge>
    </div>
};

export const YakitVersion: React.FC<YakVersionProp> = (props) => {
    const [version, setVersion] = useState<string>("dev")
    const [latestVersion, setLatestVersion] = useState("");

    useEffect(() => {
        ipcRenderer.invoke("query-latest-yakit-version").then(nv => {
            setLatestVersion(nv)
        })
        ipcRenderer.invoke("yakit-version").then(v => setVersion(`v${v}`))
    }, [])

    if (!version) {
        return <Spin tip={"正在加载 yakit 版本"}/>
    }
    const isDev = version.toLowerCase().includes("dev");
    const newVersion = latestVersion !== "" && latestVersion !== version

    if (!newVersion) {
        return <Tag color={isDev ? "red" : "geekblue"}>
            Yakit-{version}
        </Tag>
    }

    return <div>
        <Badge dot={newVersion}>
            <Button size={"small"} type={"primary"} onClick={() => {
                if (!newVersion) {
                    return
                }

                showModal({
                    title: "有新的 Yakit 版本可升级！",
                    content: <>
                        如果你现在不是很忙
                        <br/>
                        我们推荐您进入 <Button
                        type={"primary"}
                        onClick={() => {
                            openExternalWebsite("https://github.com/yaklang/yakit/releases")
                        }}
                    >Yakit Github 发布界面</Button> 下载最新版并升级！
                    </>
                })
            }}>
                Yakit-{version}
            </Button>
        </Badge>
    </div>
};

export interface AutoUpdateYakModuleViewerProp {

}

export const AutoUpdateYakModuleViewer: React.FC<AutoUpdateYakModuleViewerProp> = (props) => {
    const [end, setEnd] = useState(false);
    const [error, setError] = useState("");
    const [msg, setMsgs] = useState<ExecResultMessage[]>([]);

    useEffect(() => {
        const messages: ExecResultMessage[] = []
        ipcRenderer.on("client-auto-update-yak-module-data", (e, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString("utf8"));
                    messages.unshift(obj)
                } catch (e) {

                }
            }
        });
        ipcRenderer.on("client-auto-update-yak-module-end", (e) => {
            setEnd(true)

        });
        ipcRenderer.on("client-auto-update-yak-module-error", (e, msg: any) => {
            setError(`${msg}`)
        });
        ipcRenderer.invoke("auto-update-yak-module")
        let id = setInterval(() => setMsgs([...messages]), 1000)
        return () => {
            clearInterval(id);
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-data")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-error")
            ipcRenderer.removeAllListeners("client-auto-update-yak-module-end")
        }
    }, [])

    return <Card title={"自动更新进度"}>
        <Space direction={"vertical"} style={{width: "100%"}} size={12}>
            {error && <Alert type={"error"} message={error}/>}
            {end && <Alert type={"info"} message={"更新进程已结束"}/>}
            <Timeline pending={!end} style={{marginTop: 20}}>
                {(msg || []).filter(i => i.type === "log").map(i => i.content as ExecResultLog).map(e => {
                    return <Timeline.Item color={LogLevelToCode(e.level)}>
                        <YakitLogFormatter data={e.data} level={e.level} timestamp={e.timestamp}/>
                    </Timeline.Item>
                })}
            </Timeline>
        </Space>
    </Card>;
};

export interface AutoUpdateYakModuleButtonProp extends ButtonProps {

}

export const AutoUpdateYakModuleButton: React.FC<AutoUpdateYakModuleButtonProp> = (props) => {
    return <Popconfirm
        title={"一键更新将更新 yakit-store 中的内容与更新 nuclei templates 到本地"}
        onConfirm={e => {
            showModal({
                title: "自动更新 Yak 模块", content: <>
                    <AutoUpdateYakModuleViewer/>
                </>, width: "60%",
            })
        }}
    >
        <Button {...props} type={"link"}>
            更新 YAML POC
        </Button>
    </Popconfirm>
};

const {Text} = Typography;

interface NetInterface {
    Name: string
    Addr: string
    IP: string
}

export const ConfigGlobalReverseButton = React.memo(() => {
    const [addr, setAddr, getAddr] = useGetState("");
    const [password, setPassword, getPassword] = useGetState("");
    const [localIP, setLocalIP, getLocalIP] = useGetState("");
    const [ifaces, setIfaces] = useState<NetInterface[]>([]);
    const [visible, setVisible] = useState(false);
    const [ok, setOk] = useState(false)

    const getStatus = useMemoizedFn(() => {
        ipcRenderer.invoke("get-global-reverse-server-status").then((r) => {
            setOk(r)
            saveValue(BRIDGE_ADDR, addr)
            saveValue(BRIDGE_SECRET, password)
        })
    })
    const cancel = useMemoizedFn(() => {
        ipcRenderer.invoke("cancel-global-reverse-server-status").finally(() => {
            getStatus()
        })
    });
    const login = useMemoizedFn(() => {
        ipcRenderer.invoke("ConfigGlobalReverse", {
            ConnectParams: {Addr: addr, Secret: password},
            LocalAddr: localIP,
        }).then(() => {
            getStatus()
            // setVisible(false)
        }).catch(e => {
            failed(`Config Global Reverse Server failed: ${e}`)
        })
    })

    useEffect(() => {
        if (!visible) {
            return
        }
        getStatus()
    }, [visible])

    // 设置 Bridge
    useEffect(() => {
        if (!addr) {
            getValue(BRIDGE_ADDR).then((data: string) => {
                if (!!data) {
                    setAddr(`${data}`)
                }
            })
        }

        if (!password) {
            getValue(BRIDGE_SECRET).then((data: string) => {
                if (!!data) {
                    setPassword(`${data}`)
                }
            })
        }

        return () => {
            cancel()
        }
    }, [])

    // 如果 addr 和 password 都存在，且没有连接，则马上连接一次
    useEffect(() => {
        // 可见就退出
        if (visible) {
            return
        }

        // 如果已经连上就退出
        if (ok) {
            return
        }

        if (!!addr && !!password) {
            login()
            let id = setInterval(() => {
                login()
            }, 1000)
            return () => {
                clearInterval(id)
            }
        }
    }, [addr, password, visible, ok])

    const updateIface = useMemoizedFn(() => {
        ipcRenderer.invoke("AvailableLocalAddr", {}).then((data: { Interfaces: NetInterface[] }) => {
            const arr = (data.Interfaces || []).filter(i => i.IP !== "127.0.0.1");
            setIfaces(arr)
        })
    })

    useEffect(() => {
        if (visible) {
            updateIface()
        }
    }, [visible])

    useEffect(() => {
        if (ifaces.length === 1) {
            setLocalIP(ifaces[0].IP)
        }
    }, [ifaces])

    return <div>
        <Button type={"link"}
                onClick={() => {
                    setVisible(true)
                }}
        >配置全局反连</Button>
        <Modal visible={visible}
               width={"60%"}
               okButtonProps={{hidden: true}}
               cancelButtonProps={{hidden: true}}
               closable={true}
               onCancel={() => {
                   setVisible(false)
               }} afterClose={() => setVisible(false)}>
            <Form
                style={{marginTop: 20}}
                onSubmitCapture={e => {
                    e.preventDefault()

                    login()
                }} labelCol={{span: 5}} wrapperCol={{span: 14}}>
                <InputItem
                    label={"本地反连 IP"}
                    value={localIP} disable={ok}
                    setValue={setLocalIP}
                    help={<div>
                        <Button type={"link"} size={"small"} onClick={() => {
                            updateIface()
                        }} icon={<ReloadOutlined/>}>
                            更新 yak 引擎本地 IP
                        </Button>
                    </div>}
                />
                <Divider orientation={"left"}>公网反连配置</Divider>
                <Form.Item label={" "} colon={false}>
                    <Alert message={<Space direction={"vertical"}>
                        <div>在公网服务器上运行</div>
                        <Text code={true} copyable={true}>yak bridge --secret [your-password]</Text>
                        <div>或</div>
                        <Text code={true} copyable={true}>
                            docker run -it --rm --net=host v1ll4n/yak-bridge yak bridge --secret
                            [your-password]
                        </Text>
                        <div>已配置</div>
                    </Space>}/>
                </Form.Item>
                <InputItem
                    label={"Yak Bridge 地址"} value={addr}
                    setValue={setAddr} disable={ok}
                    help={"格式 host:port, 例如 cybertunnel.run:64333"}
                />
                <InputItem
                    label={"Yak Bridge 密码"}
                    setValue={setPassword} value={password}
                    type={"password"} disable={ok}
                    help={`yak bridge 命令的 --secret 参数值`}
                />
                <Form.Item colon={false} label={" "}>
                    <Button type="primary" htmlType="submit" disabled={ok}> 配置反连 </Button>
                    {ok && <Button type="primary" danger={true} onClick={() => {
                        cancel()
                    }}> 停止 </Button>}
                </Form.Item>
            </Form>
        </Modal>
    </div>
});

interface YakScriptParam {
    Script: string
    Params: YakExecutorParam[]
}

export const startExecYakCode = (
    verbose: string,
    params: YakScriptParam) => {
    let m = showModal({
        width: "60%", maskClosable: false,
        title: `正在执行：${verbose}`,
        content: <div style={{height: 400, overflowY: "auto"}}>
            <AutoCard>
                <StartToExecYakScriptViewer script={params} verbose={verbose}/>
            </AutoCard>
        </div>
    })
}

const StartToExecYakScriptViewer = React.memo((props: {
    verbose: string,
    script: YakScriptParam,
}) => {
    const {script, verbose} = props;
    const [token, setToken] = useState(randomString(40));
    const [loading, setLoading] = useState(true);
    const [infoState, {reset, setXtermRef}] = useHoldingIPCRStream(
        verbose, "ExecYakCode",
        token, () => setTimeout(() => setLoading(false), 300),
        () => {
            ipcRenderer.invoke("ExecYakCode", script, token).then(() => {
                info(`执行 ${verbose} 成功`)
            }).catch(e => {
                failed(`执行 ${verbose} 遇到问题：${e}`)
            })
        }
    )

    return (
        <PluginResultUI
            loading={loading} defaultConsole={false}
            statusCards={infoState.statusState}
            featureType={infoState.featureTypeState}
            feature={infoState.featureMessageState}
            progress={infoState.processState}
            results={infoState.messageState}
            onXtermRef={setXtermRef}
        />
    )
})