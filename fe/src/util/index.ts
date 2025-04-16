import {
  JsonRpcProvider,
  Contract,
  parseEther,
  parseUnits,
  formatEther,
  formatUnits,
  getAddress,
  toBeHex,
  ZeroAddress,
  toBigInt
} from 'ethers'
import {type BigNumberish, isHexString} from 'ethers'
import tokenAbi from '@src/config'
import abiJSON from '@src/util/abis.json'
import { EAREND_TOKEN_ADDRESS } from '../config'

/**
 * 将任意值转换为BigInt
 * @param value 任意数值(字符串/数字/BigInt)
 * @returns BigInt
 */
export function toBigIntSafe(value: any): bigint {
  if (typeof value === 'bigint') return value
  try {
    return BigInt(value.toString().replace(/\.\d+/, ''))
  } catch (e) {
    console.error('toBigIntSafe error:', e)
    throw e
  }
}

/**
 * 将wei单位的BigInt转换为以太值(带小数), 默认保留2位小数
 * @param value wei值
 * @param fractionDigits 小数精度
 */
export function formatEtherValue(value: any, fractionDigits = 2): number | any {
  try {
    const val = toBigIntSafe(value)
    return parseFloat(Number(formatEther(val)).toFixed(fractionDigits))
  } catch (e) {
    console.error('formatEtherValue error:', e)
    return value
  }
}

/**
 * 将指定单位的BigInt转换为可读数字
 * @param value 原始值(BigInt/字符串)
 * @param fractionDigits 小数精度
 * @param decimals 单位精度(默认18)
 */
export function formatUnitsValue(value: any, fractionDigits = 2, decimals = 18): number | any {
  try {
    const val = toBigIntSafe(value)
    return parseFloat(Number(formatUnits(val, decimals)).toFixed(fractionDigits))
  } catch (e) {
    console.error('formatUnitsValue error:', e)
    return value
  }
}

//将以太数值(字符串/数字)转换为wei(BigInt)
export function parseEtherValue(value: string | number) {
  try {
    return parseEther(value.toString()) 
  } catch (e) {
    console.error('parseEtherValue error:', e)
    return value
  }
}

//将任意值转换为wei(BigInt)
export function parseWeiValue(value: string | number) {
  try {
    return parseUnits(value.toString(), 'wei')
  } catch (e) {
    console.error('parseWeiValue error:', e)
    return value
  }
}

//获取当前连接的钱包账户
export async function getAccounts(): Promise<string[]> {
  const accounts = await window.ethereum.request({method: 'eth_requestAccounts'})
  return accounts
}

/**
 * 将时间戳格式转换为字符串
 * 支持: YYYY , MM, DD, HH, mm, ss, Month
 */
export function formatData(timestamp: number | string, formatter = 'YYYY-MM-DD'): string {
  const d = new DataTransfer(Number(timestamp))
  if (!d || isNaN(d.getTime())) return ''

  const fillZero = (num: number): string => num < 10 ? `0${num}` : `${num}`
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  return formatter
  .replace(/YYYY/g, `${d.getFullYear()}`)
  .replace(/MM/g, fillZero(d.getMonth() + 1))
  .replace(/Month/g, months[d.getMonth()])
  .replace(/DD/g, fillZero(d.getDate()))
  .replace(/HH/g, fillZero(d.getHours()))
  .replace(/mm/g, fillZero(d.getMinutes()))
  .replace(/ss/g, fillZero(d.getSeconds()))  
}

//16进制字符串转字节数组
export function hexToBytes(hex: string): number[] f{
  const cleanHex = hex.startWith('0x') ? hex.slice(2) : hex
  const bytes: number[] = []
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16))
  }
  return bytes
}

//字节数组转16进制字符串
export function bytesToHex(bytes: number[]): string {
  return '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('')
}

//千位分隔数字格式化
export function formatNumber(num: number | string): string {
  const n = Number(num)
  if (isNaN(n)) return ''
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  return n.toLocaleString()
}

//简单分隔数字(千位加逗号)
export function separateNumWithComma(num: number | string): string {
  const n = Number(num)
  if (isNaN(n)) return ''
  return n.toLocaleString()
}