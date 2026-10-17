"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\nasync function register() {\n    if (true) {\n        const { warmDb } = await Promise.all(/*! import() */[__webpack_require__.e(\"vendor-chunks/drizzle-orm@0.30.10_@neondatabase+serverless@0.9.5_@types+pg@8.11.6_@types+react@18.3.31_react@18.3.1\"), __webpack_require__.e(\"vendor-chunks/@neondatabase+serverless@0.9.5\"), __webpack_require__.e(\"_instrument_src_db_index_ts\")]).then(__webpack_require__.bind(__webpack_require__, /*! ./db */ \"(instrument)/./src/db/index.ts\"));\n        await warmDb();\n        console.log(\"[db] Neon connection warmed\");\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7O0FBQU8sZUFBZUE7SUFDcEIsSUFBSUMsSUFBcUMsRUFBRTtRQUN6QyxNQUFNLEVBQUVHLE1BQU0sRUFBRSxHQUFHLE1BQU0seVlBQWM7UUFDdkMsTUFBTUE7UUFDTkMsUUFBUUMsR0FBRyxDQUFDO0lBQ2Q7QUFDRiIsInNvdXJjZXMiOlsiL2hvbWUvcm0vcHJvamVjdHMvbGlmZS1vcy9hcHBzL2ZhaXRoL3NyYy9pbnN0cnVtZW50YXRpb24udHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICBpZiAocHJvY2Vzcy5lbnYuTkVYVF9SVU5USU1FID09PSBcIm5vZGVqc1wiKSB7XG4gICAgY29uc3QgeyB3YXJtRGIgfSA9IGF3YWl0IGltcG9ydChcIi4vZGJcIik7XG4gICAgYXdhaXQgd2FybURiKCk7XG4gICAgY29uc29sZS5sb2coXCJbZGJdIE5lb24gY29ubmVjdGlvbiB3YXJtZWRcIik7XG4gIH1cbn0iXSwibmFtZXMiOlsicmVnaXN0ZXIiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9SVU5USU1FIiwid2FybURiIiwiY29uc29sZSIsImxvZyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(instrument)/./src/instrumentation.ts"));
module.exports = __webpack_exports__;

})();