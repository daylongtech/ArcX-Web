import web3 from '@solana/web3.js'
import * as splToken from '@solana/spl-token'
import bs58 from 'bs58'
import express from 'express'
import multer from 'multer'
import pkg from 'express-validator'

const { validationResult, check } = pkg
const FormData = multer()
const router = express.Router()
const connection = new web3.Connection('http://3.90.29.127:8899', 'confirmed')

async function createTokenAccount(feePk, mintPk, gameShiftPk) {
  var return_json = {}
  try {
    const feePayer = web3.Keypair.fromSecretKey(bs58.decode(feePk))
    const mintPubkey = new web3.PublicKey(mintPk)
    var alice
    if (!gameShiftPk) {
      const account = web3.Keypair.generate()
      alice = account.publicKey
      const accountPk = account.publicKey.toBase58()
      const accountSk = bs58.encode(account.secretKey)
      return_json['account'] = { pk: accountPk, sk: accountSk }
    } else {
      alice = new web3.PublicKey(gameShiftPk)
    }
    // local ATA account
    let ata = await splToken.getAssociatedTokenAddress(mintPubkey, alice, false)
    console.log(`ata:  ${ata.toBase58()}`)
    return_json['ATA'] = ata

    // ATA account upload
    const tx = new web3.Transaction()
    tx.add(
      splToken.createAssociatedTokenAccountInstruction(feePayer.publicKey, ata, alice, mintPubkey)
    )
    console.log(`txhash: ${await connection.sendTransaction(tx, [feePayer])}`)
    return_json['TX'] = tx
  } catch (err) {
    return_json['err'] = err
  }
  return return_json
}
// create coin account
router.post(
  '/create_arcx_account',
  [FormData.none(), check('feePayer').exists(), check('mintPubkey').exists()],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(200).json({ msg: 'parameters error', errors: errors.array() })
    }
    const data = req.body
    const feePk = data.feePayer
    const mintPk = data.mintPubkey
    const gameShiftPk = data.gameShiftWallet || ''
    const response = await createTokenAccount(feePk, mintPk, gameShiftPk)
    return res.json({ data: response })
  }
)

// get account balance
router.post(
  '/arcx_account_balance',
  [FormData.none(), check('tokenAccount').exists()],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(200).json({ msg: 'parameters error', errors: errors.array() })
    }
    const address = req.body.tokenAccount
    try {
      const tokenAccountPubkey = new web3.PublicKey(address)
      let tokenAmount = await connection.getTokenAccountBalance(tokenAccountPubkey)
      return res.json(tokenAmount)
    } catch (err) {
      return res.json({ errorMsg: err })
    }
  }
)
// axc transfer
router.post(
  '/arcx_transfer',
  [
    FormData.none(),
    check('publicKey').exists(),
    check('tokenAccount1Pubket').exists(),
    check('tokenAccount2Pubket').exists(),
    check('mintPubkey').exists(),
    check('amount').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(200).json({ msg: 'parameters error', errors: errors.array() })
    }
    try {
      const data = req.body
      const fromWallet = web3.Keypair.fromSecretKey(bs58.decode(data.publicKey))
      const transaction = new web3.Transaction()
      transaction.add(
        splToken.createTransferInstruction(
          // send account pk
          new web3.PublicKey(data.tokenAccount1Pubket),
          // revecive  account pk
          new web3.PublicKey(data.tokenAccount2Pubket),
          // pck account pk
          fromWallet.publicKey,
          data.amount,
          []
          // new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        )
      )
      const hash = await connection.sendTransaction(transaction, [fromWallet])
      console.log(`tranctionHash: ${hash}`)
      // Sign transaction, broadcast, and confirm
      return res.json({ hash: hash, message: 'success' })
    } catch (err) {
      console.log(err)
      return res.json({ errorMsg: err })
    }
  }
)
// get transtraction order
router.post(
  '/load_transtraction',
  [FormData.none(), check('signature').exists()],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(200).json({ msg: 'parameters error', errors: errors.array() })
    }
    const address = req.body.signature
    try {
      let transactionMsg = await connection.getTransaction(address)
      return res.json(transactionMsg)
    } catch (err) {
      return res.json({ errorMsg: err })
    }
  }
)

// transaction hash
router.post(
  '/arcx_transfer_transaction',
  [
    FormData.none(),
    check('publicKey').exists(),
    check('tokenAccountXPubkey').exists(),
    check('tokenAccountYPubkey').exists(),
    check('mintPubkey').exists(),
    check('amount').exists(),
    check('decimals').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(200).json({ msg: 'parameters error', errors: errors.array() })
    }
    const data = req.body
    try {
      let recentBlockhash = await connection.getLatestBlockhash()
      const tx = new web3.Transaction({
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
        feePayer: new web3.PublicKey(data.publicKey)
      })
      tx.add(
        splToken.createTransferCheckedInstruction(
          new web3.PublicKey(data.tokenAccountXPubkey),
          new web3.PublicKey(data.mintPubkey),
          new web3.PublicKey(data.tokenAccountYPubkey),
          new web3.PublicKey(data.publicKey),
          data.amount,
          data.decimals
        )
      )
      const hex = tx.serializeMessage().toString('hex')
      return res.json({ txhash: hex })
    } catch (err) {
      return res.json({ errorMsg: err })
    }
  }
)
export default router
