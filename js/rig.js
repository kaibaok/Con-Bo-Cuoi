/* Thông số khung xương: hw là nửa bề ngang thân, tail là điểm gắn đuôi (toạ độ ảnh 299x394). Tạo bởi make6.py */
const RIG = {"small": {"hw": 40, "tail": [183, 300], "tailH": [183, 300]}, "big": {"hw": 64, "tail": [200, 300], "tailH": [200, 300]}, "fast": {"hw": 38, "tail": [178, 300], "tailH": [178, 300]}, "mad": {"hw": 48, "tail": [182, 300], "tailH": [182, 300]}, "red": {"hw": 50, "tail": [186, 300], "tailH": [186, 300]}, "gold": {"hw": 48, "tail": [188, 300], "tailH": [188, 300]}, "rainbow": {"hw": 44, "tail": [178, 300], "tailH": [178, 300]}, "witch": {"hw": 42, "tail": [174, 300], "tailH": [174, 300]}, "ghost": {"hw": 50, "tail": [178, 300], "tailH": [178, 300]}};

RIG.normal = { hw: 40, tail: [183, 300], tailH: [183, 300] };
const ADMIN = new URLSearchParams(location.search).get('admin') === '1';
