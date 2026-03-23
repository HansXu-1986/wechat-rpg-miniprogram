// 云函数：保存游戏进度
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 保存游戏进度
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { gameData } = event
  
  try {
    const result = await db.collection('game_data').where({
      openid: OPENID
    }).get()
    
    if (result.data.length > 0) {
      // 更新
      await db.collection('game_data').doc(result.data[0]._id).update({
        data: {
          gameData,
          updateTime: db.serverDate()
        }
      })
    } else {
      // 新建
      await db.collection('game_data').add({
        data: {
          openid: OPENID,
          gameData,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    }
    
    return {
      success: true,
      message: '保存成功'
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err
    }
  }
}
