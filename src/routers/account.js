
const router = require("express").Router();
const session = require("express-session");
const mysql = require('mysql');
const dbconfig = require('../db.js');
// const conn = mysql.createConnection(dbconfig);

require('dotenv').config();
const secretCode = process.env.secretCode; // .env로부터 환경변수 불러오기

//세션 환경변수로 만들기
router.use(session({
    resave: false,
    saveUninitialized: false,
    secret: secretCode  //secretCode를 외부에서 알기 어려워짐
}));

// 회원가입 api
router.post('/', (req, res) => {
    const { userID, userPw, userPwCheck, userName, userPhonenumber, userBirth } = req.body;
    const result = {
        "success": false,
        "message": ""
    };
    const query = `INSERT INTO account(id, pw, name, phonenumber,birth) VALUES (?,?,?,?,?)`;
    const values = [userID, userPw, userName, userPhonenumber, userBirth];
    const userIDRegex = /^\w[\w\d!@#$%^&*()_+{}|:"<>?/-]{1,19}$/;
    const userPwRegex = /^(?=.*\w)(?=.*\d)(?=.*[!@#$%^&*()_+{}|:"<>?/-]).{1,20}$/;
    const userNameRegex = /^[가-힣]{2,5}$/;
    const userPhonenumberRegex = /^[0-9]{10,12}$/;
    const userBirthRegex = /^[\d]{4}-[\d]{2}-[\d]{2}$/

    try {
        if (!userID?.trim() || !userPw?.trim() || !userPwCheck?.trim() || !userName?.trim() || !userPhonenumber?.trim() || !userBirth?.trim()) { // 널값이라면
            throw new Error("빈값이 존재해요");
        }
        if (!userIDRegex.test(userID)) {
            throw new Error("id형식이 맞지않음");
        }
        if (!userPwRegex.test(userPw)) {
            throw new Error("비번 글자제한");
        }
        if (!userNameRegex.test(userName)) {
            throw new Error("이름 글자제한 2~5글자");
        }
        if (!userPhonenumberRegex.test(userPhonenumber)) {
            throw new Error("전화번호 형식제한 숫자 10~12글자");
        }
        if (!userBirthRegex.test(userBirth)) {
            throw new Error("생일형식 불일치")
        }
        if (userPw != userPwCheck) {
            throw new Error("비밀번호확인 불일치");
        }

        conn.query(query, values, (err) => {
            if (err) {
                console.log(err);
                throw new Error(err);
            }
        });
        result.success = true;
        result.message = "회원가입성공";
    } catch (e) {
        result.message = e.message;
    } finally {
        res.send(result);
        conn.end();
    }
})

// 로그인 api
router.get("/login", (req, res) => {
    const { userID, userPw } = req.body;
    const result = {
        "success": false,
        "message": "로그인실패"
    };

    try {
        //정규식 별도파일로빼기
        const userIDRegex = /^\w[\w\d!@#$%^&*()_+{}|:"<>?/-]{1,19}$/;
        const userPwRegex = /^(?=.*\w)(?=.*\d)(?=.*[!@#$%^&*()_+{}|:"<>?/-]).{1,20}$/;

        if (!userID?.trim() || !userPw?.trim()) throw new Error("빈값이 존재해요")
        if (!userIDRegex.test(userID)) throw new Error("아이디 글자제한")
        if (!userPwRegex.test(userPw)) throw new Error("비번 글자제한");

        const conn = mysql.createConnection(dbconfig);
        const query = "SELECT * FROM account WHERE id = ? AND pw = ?";
        const values = [userID, userPw];

        //query메소드의 3번째인자의 함수는 콜백함수로, 비동기적으로 동작하는 함수이다
        //그래서 query문의 뒷부분까지 미리 실행되고나서, 콜백함수 실행된다.
        //함수구조를 바꾸어 동기적으로 작동하게끔 만들어준다.
        conn.query(query, values, (err, rows) => { // 반환되는 rows는 배열이다.
            try {
                if (err) throw new Error(err);
                if (rows.length == 0) throw new Error("로그인정보없음");

                console.log(rows);
                req.session.idx = rows[0].idx;
                req.session.name = rows[0].name;
                req.session.phonenumber = rows[0].phonenumber;
                req.session.birth = rows[0].birth;
                result.success = "true";
                result.message = "로그인성공";

            } catch (e) {
                result.message = e.message;
            } finally {
                conn.end();
                res.send(result);
            }
        })
    } catch (e) {
        result.message = e.message;
        res.send(result);
    }
})

//로그아웃
router.delete("/logout", (req, res) => {
    const result = {
        "success": false,
        "message": "로그아웃실패"
    }
    try {
        req.session.destroy;
        result.success = true;
        result.message = "로그아웃성공";
    } catch (e) {
        result.message = e.message;
    } finally {
        res.send(result);
    }
})

//id중복찾기
router.get("/idCheck", (req, res) => {
    const userID = req.body.userID;
    const result = {
        "success": false,
        "message": "id중복",
        "data":
            { isDuplicated: false }
    }
    const query = `SELECT idx FROM account WHERE id = ? `;
    const values = [userID];
    const userIDRegex = /^\w[\w\d!@#$%^&*()_+{}|:"<>?/-]{1,19}$/;

    try {
        if (!userID?.trim()) {
            throw new Error("빈값이 존재해요");
        }
        if (!userIDRegex.test(userID)) {
            throw new Error("아이디 글자제한");
        }

        conn.query(query, values, (err, rows) => { // 3번째인자 : 콜백함수 : <err:에러객체>, <rows:결과 배열>,<fields:쿼리 결과에 대한 필드 정보, 보통안씀>
            if (err) {
                throw new Error("db에러");
            };
            if (rows.length > 0) {
                result.data.isDuplicated = true;
                result.message = "중복된아이디";
                console.log(rows);
            } else {
                result.success = true;
                result.message = "사용가능한 id";
                result.data.isDuplicated = false;
            }
        });
    } catch (e) {
        result.message = e.message;
    } finally {
        res.send(result);
        conn.end();
    }
})

//id찾기
router.get("/id", (req, res) => {
    const { userName, userPhonenumber } = req.body;
    const result = {
        "success": false,
        "message": "id찾기실패",
        "id": ""      //id도 반환해줘야함
    }
    const userPhonenumberRegex = /^[0-9]{10,12}$/;
    const userNameRegex = /^[가-힣]{2,5}$/;
    const query = "SELECT id FROM account WHERE name = ? AND phonenumber = ?";
    const values = [userName, userPhonenumber];
    try {
        if (!userName?.trim() || !userPhonenumber?.trim()) { // 널값이라면
            throw new Error("빈값이 존재해요")
        }
        if (!userNameRegex.test(userName)) {
            throw new Error("이름 글자제한 2~5글자");
        }
        if (!userPhonenumberRegex.test(userPhonenumber)) {
            throw new Error("전화번호 형식제한 숫자 10~12글자");
        }

        conn.query(query, values, (err, rows) => {
            if (err) {
                throw new Error("db에러");
            }
            if (rows > 0) {
                result.success = true;
                result.message = "id찾기 성공";
                result.id = rows.id;
            }
        })
    } catch (e) {
        result.message = e.message;
    } finally {
        res.send(result)
        conn.end();
    }

})
//비밀번호찾기
router.get("/pw", (req, res) => {
    //예외처리
    const { userID, userName, userPhonenumber } = req.body;
    const result = {
        "success": false,
        "message": "pw찾기실패",
        "pw": ""
    }
    const userIDRegex = /^\w[\w\d!@#$%^&*()_+{}|:"<>?/-]{1,19}$/;
    const userNameRegex = /^[가-힣]{2,5}$/;
    const userPhonenumberRegex = /^[0-9]{10,12}$/;
    const query = "SELECT pw FROM account WHERE id = ? AND name = ? AND phonenumber = ?";
    const values = [userID, userName, userPhonenumber];

    try {
        if (!userID?.trim() || !userName?.trim() || !userPhonenumber?.trim()) { // 널값이라면
            throw new Error("빈값이 존재해요")
        }
        if (!userIDRegex.test(userID)) {
            throw new Error("id형식이 맞지않음")
        }
        if (!userNameRegex.test(userName)) {
            throw new Error("이름 글자제한 2~5글자");
        }
        if (!userPhonenumberRegex.test(userPhonenumber)) {
            throw new Error("전화번호 형식제한 숫자 10~12글자");
        }

        conn.query(query, values, (err, rows) => {
            if (err) {
                throw new Error("db에러");
            }
            if (rows > 0) {
                result.success = true;
                result.message = "pw찾기 성공";
                result.pw = rows.pw;
            }
        })

    } catch (e) {
        result.message = e.message;
    } finally {
        res.send(result);
        conn.end();

    }
})
//내정보보기
router.get("/info/:idx", (req, res) => {
    const { idx } = req.params;
    //idx는 세션으로 받아오기 , body x
    //idx 유무 체크
    const result = {
        "success": false,
        "message": "실패",
        "data": {
            "name": "",
            "phonenumber": "",
            "birth": "",
            "signupDate": "",
            "profile": ""
        }
    }
    const query = "SELECT * FROM account WHERE idx = ?";
    const values = [idx];
    try {
        console.log(req.session.idx);
        console.log(idx);

        if (req.session.idx != idx) { // 세션이다른경우
            throw new Error("사용자idx 불일치")
        }

        conn.query(query, values, (err, rows) => {
            if (err) {
                throw new Error("db에러");
            }
            if (rows > 0) {
                console.log(rows)
                result.success = true;
                result.message = "내정보 조회 성공";
                result.data.name = rows.name;
                result.data.phonenumber = rows.phonenumber;
                result.data.birth = rows.birth;
                result.data.signupDate = rows.signupDate;
                result.data.profile = rows.profile;
            }
        })

    } catch (e) {
        result.message = e.message;
    } finally {
        res.send(result);
        conn.end();
    }
})
//정보수정
router.put("/:idx", (req, res) => {
    const { userName, userPhonenumber, birth, profile } = req.body;
    const idx = req.params
    const result = {
        "success": false,
        "message": "수정실패",
        "data": {
            "name": "",
            "phonenumber": "",
            "birth": "",
            "profile": ""
        }
    }
    const query = "UPDATE FROM account SET name = ?, phonenumner = ?, birth = ?, profile = ? WHERE idx = ?";
    const values = [userName, userPhonenumber, birth, profile, idx];
    try {
        if (req.session.idx !== idx) { // 세션이 널값이라면
            throw new Error("사용자idx 불일치")
        }

        conn.query(query, values, (err, rows) => {
            if (err) {
                throw new Error("db에러");
            }
            if (rows > 0) {
                console.log(rows)
                result.success = true;
                result.message = "내정보 조회 성공";
                result.data.name = rows.name;
                result.data.phonenumber = rows.phonenumber;
                result.data.birth = rows.birth;
                result.data.profile = rows.profile;
            }
        })

    } catch {
        result.message = e.message;
    } finally {
        res.send(result);
        conn.end();
    }
});
//회원탈퇴
router.delete("/:idx", (req, res) => {

    const idx = req.params;
    const result = {
        "success": false,
        "message": "실패",
    };
    const query = "DELETE FROM account WHERE idx = ?";
    const values = [idx];
    try {

        if (req.session.idx !== idx) { // 세션이 널값이라면
            throw new Error("사용자idx 불일치")
        }

        conn.query(query, values, (err, rows) => {
            if (err) {
                throw new Error("db에러");
            }
            if (rows > 0) {
                console.log(rows)
                result.success = true;
                result.message = "회원탈퇴 성공";
            }
        })
    } catch {
        result.message = e.message;
    } finally {
        res.send(result);
        conn.end();
    }
})

module.exports = router;






