/**
로켓챗에 아바타 추가 방법
1. 로켓챗에 접속한다.
2. 관리자 계정으로 로그인한다.
3. 관리메뉴를 클릭한다.
4. 메뉴 중 레이아웃을 클릭한다.
5. 사용자 정의 스크립트를 펼친다.
6. 로그인한 사용자를 위한 사용자 정의 스크립트에 아래 내용을 붙혀넣는다.
7. 저장한다.
8. 변화가있느지 확인한다.
   **/

```javascript

let eventCode = null;
let pathname = null;
function avatarOpen() {
    try {
        if (pathname === location.pathname ) {

        } else if( $("div[name=avatar]").length > 0 ) {
            $("div[name=avatar]").remove();
        } else {
            clearTimeout(eventCode);
            token = localStorage.getItem("Meteor.loginToken")
            uid = localStorage.getItem("Meteor.userId")
            fetch("/api/v1/users.info?userId=" + uid, {
                method: "GET",
                headers: {
                    "X-Auth-Token": token,
                    "X-User-Id": uid,
                    "Content-Type": "application/json"
                }
            })
                .then(res => res.json())
                .then(json => {
                    const user = json.user;
                    console.log(user);
                    pathname = location.pathname;
                    const roomKey = location.pathname;
                    const roomName = $("main div:eq(2) div:eq(2)").text() + " 대화방 입장";
                    $("div[name=avatar]").remove();
                    $(".messages-box:eq(0)").before(`
                        <div name="avatar" style="border-bottom: 1px solid silver; width: 100%; height: 550px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <iframe allow="microphone" src="https://avatar.danawa.io?userName=${user.username||user.name}&roomKey=${roomKey}&roomName=${roomName}" style="width: 100%; height: 100%;"></iframe>
                        </div>
                    `)
                    eventCode = setTimeout(() => avatarOpen(), 500)
                })
        }
    } catch(err) {
        console.log(err)
    }
    if (eventCode !== null) {
        clearTimeout(eventCode);
        eventCode = null
    }
    eventCode = setTimeout(() => avatarOpen(), 500)
}
eventCode = setTimeout(() => avatarOpen(), 500)

```