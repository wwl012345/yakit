import React, {useEffect, useState} from "react";
import {Button, Form, Popconfirm, Popover, Space, Table, Tag, Typography} from "antd";
import {genDefaultPagination, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema";
import {failed} from "../../utils/notification";
import {ReloadOutlined, SearchOutlined} from "@ant-design/icons";
import {TableFilterDropdownString} from "../risks/RiskTable";
import {useMemoizedFn} from "ahooks";
import {showModal} from "../../utils/showModal";
import {InputItem} from "../../utils/inputUtil";
import {startExecYakCode} from "../../utils/basic";
import {OutputAsset} from "./outputAssetYakCode";

export interface Domain {
    ID?: number
    DomainName: string
    IPAddr: string
    HTTPTitle: string
}

export interface QueryDomainsRequest extends QueryGeneralRequest {
    Network?: string
    DomainKeyword?: string
    Title?: string
}

export interface DomainAssetPageProps {
}

const {ipcRenderer} = window.require("electron");
const {Text} = Typography

export const DomainAssetPage: React.FC<DomainAssetPageProps> = (props: DomainAssetPageProps) => {
    const [params, setParams] = useState<QueryDomainsRequest>({
        Pagination: genDefaultPagination(20),
    });
    const [response, setResponse] = useState<QueryGeneralResponse<Domain>>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    });
    const [loading, setLoading] = useState(false);
    const {Data, Total, Pagination} = response;
    const [outputDomainKeyword, setOutputDomainKeyword] = useState("*");


    const update = useMemoizedFn((page?: number, limit?: number,) => {
        const newParams = {
            ...params,
        }
        if (page) newParams.Pagination.Page = page;
        if (limit) newParams.Pagination.Limit = limit;

        setLoading(true)
        ipcRenderer.invoke("QueryDomains", newParams).then(data => {
            setResponse(data)
        }).catch((e: any) => {
            failed("QueryExecHistory failed: " + `${e}`)
        }).finally(() => {
            setTimeout(() => setLoading(false), 200)
        })
    })

    const delDomain = useMemoizedFn((host?: string) => {
        const params = !!host ? {DomainKeyword: host} : {DeleteAll: true}

        setLoading(true)
        ipcRenderer
            .invoke("DeleteDomains", params)
            .then(() => {
                update(1)
            })
            .catch((e) => {
                failed(`DelDomain failed: ${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1, 20)
    }, [])

    return <Table<Domain>
        loading={loading}
        pagination={{
            size: "small", current: +Pagination.Page,
            pageSize: Pagination?.Limit || 10, showSizeChanger: true,
            total: Total, showTotal: (i) => <Tag>共{i}条历史记录</Tag>,
            onChange: (page: number, limit?: number) => {
                update(page, limit)
            }
        }}
        title={e => {
            return <div style={{display: "flex", justifyContent: "space-between"}}>
                <Space>
                    <div>域名资产</div>
                    <Button
                        type={"link"} onClick={() => update(1)}
                        size={"small"} icon={<ReloadOutlined/>}
                    />
                </Space>
                <Space>
                    <Popover title={"输入想要导出的域名关键字"}
                             trigger={["click"]}
                             content={<div>
                                 <Form layout={"inline"} size={"small"} onSubmitCapture={e => {
                                     e.preventDefault()

                                     startExecYakCode("Output Domains", {
                                         Script: OutputAsset.outputDomainByKeyword, Params: [
                                             {Key: "keyword", Value: outputDomainKeyword}
                                         ]
                                     })
                                 }}>
                                     <InputItem
                                         label={"域名关键字"} value={outputDomainKeyword}
                                         setValue={setOutputDomainKeyword}
                                     />
                                     <Form.Item colon={false} label={" "}>
                                         <Button size={"small"} type="primary" htmlType="submit"> 导出 </Button>
                                     </Form.Item>
                                 </Form>
                             </div>}
                    >
                        <Button
                            type={"primary"}
                            size={"small"}
                        >导出域名</Button>
                    </Popover>
                    <Popconfirm title="确定删除所有域名资产吗? 不可恢复" onConfirm={e => delDomain()}>
                        <Button
                            type="link"
                            danger
                            size="small"
                        >删除全部</Button>
                    </Popconfirm>
                </Space>
            </div>
        }}
        size={"small"} bordered={true}
        dataSource={Data}
        rowKey={e => `${e.ID}`}
        columns={[
            {
                title: "域名",
                render: (i: Domain) => <Text style={{maxWidth: 470}} ellipsis={{tooltip: true}}>{i.DomainName}</Text>,
                filterIcon: (filtered) => {
                    return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}}/>
                },
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return (
                        params &&
                        setParams && (
                            <TableFilterDropdownString
                                label={"搜索关键字"}
                                params={params}
                                setParams={setParams}
                                filterName={"DomainKeyword"}
                                confirm={confirm}
                                setSelectedKeys={setSelectedKeys}
                                update={update}
                            />
                        )
                    )
                }
            },
            {
                title: "IP",
                dataIndex: "IPAddr",
                width: 160,
                filterIcon: (filtered) => {
                    return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}}/>
                },
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return (
                        params &&
                        setParams && (
                            <TableFilterDropdownString
                                label={"搜索IP"}
                                params={params}
                                setParams={setParams}
                                filterName={"Network"}
                                confirm={confirm}
                                setSelectedKeys={setSelectedKeys}
                                update={update}
                            />
                        )
                    )
                }
            },
            {
                title: "HTMLTitle",
                dataIndex: "HTTPTitle",
                filterIcon: (filtered) => {
                    return params && <SearchOutlined style={{color: filtered ? "#1890ff" : undefined}}/>
                },
                filterDropdown: ({setSelectedKeys, selectedKeys, confirm}) => {
                    return (
                        params &&
                        setParams && (
                            <TableFilterDropdownString
                                label={"搜索关键字"}
                                params={params}
                                setParams={setParams}
                                filterName={"Title"}
                                confirm={confirm}
                                setSelectedKeys={setSelectedKeys}
                                update={update}
                            />
                        )
                    )
                }
            },
            {
                title: "操作",
                render: (i: Domain) => (
                    <Space>
                        <Button
                            size="small"
                            type={"link"}
                            danger
                            onClick={() => delDomain(i.DomainName)}
                        >
                            删除
                        </Button>
                    </Space>
                )
            }
        ]}
    >

    </Table>
}