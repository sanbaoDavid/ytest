/**
 * @功能
 * 1. 实现文字排版，效果嵌套
 * 2. 支持多效果内外嵌套，也支持部分嵌套：<a><b><a><b>
 * @扩展性
 * 1. 支持标签名称自定义
 * 2. 支持单双标签内容和效果自定义
 * @扩展方法
 * 1. 定义双标签：在_doubleFlag数组里添加想定义的标签名称
 * 2. 定义单标签：在_singleFlag数组里添加想定义的标签名称
 * 3. 定义标签操作：在_markEvent里面定义对应名称标签的操作，会传递当前的label节点
 * @使用方法
 * 1. 外部调用parseStr方法，传递字符串
 * @注意事项
 * 1. <a>content<a>这是双标签书写方式，结束标签没有/符号
 * 2. 没有做双标签个数不是偶数的处理，所以多写会出问题
 * 3. 变量前加下划线的除了_doubleFlag、_singleFlag、_markEvent其他不能自己改
 * 4. 直接在节点上挂载脚本即可使用
 */
const { ccclass, property } = cc._decorator;

@ccclass
export default class Page22ytext extends cc.Component {
  //下划线预制体
  @property(cc.Prefab)
  line: cc.Prefab = null;

  //要渲染的文本
  @property
  string: string = "";

  //字体大小
  @property
  fontSize: number = 40;

  //单双标签列表
  _singleFlag: Array<string> = ["br"];
  _doubleFlag: Array<string> = ["u"];
  //标签时间列表
  _markEvent = {
    br: () => {
      this._pointer.x = 0;
      this._pointer.y -= this.fontSize;
    },
    u: node => {
      let ratio = 5;
      let c = node.getChildByName(this.line.name);
      if (c === null) {
        c = cc.instantiate(this.line);
        c.parent = node;
        c.height = this.fontSize * 0.1;
        c.width = Math.max(this.fontSize * ratio, node.width);
        c.y = -this.fontSize * 0.739;
      }
      c.active = true;
      if (node.width < this.fontSize * ratio) {
        node.x += Math.abs((this.fontSize * ratio) / 2 - node.width / 2);
        this._pointer.x += this.fontSize * ratio - node.width;
      }
    },
  };

  //以下标签不可改
  //label列表 根据输入文本动态创建
  _labList: Array<cc.Node> = [];
  //实际组件解析文本时所用的字符串变量
  _config: string = "";
  //位置指示
  _pointer: cc.Vec2;

  parseStr(str: string = undefined) {
    this._config = str ? str : this.string;
    let markRegex = new RegExp("(<)(\\w+)(>)", "gm");

    let allInfo = [];
    let contentInfo = [];
    //@ts-ignore
    Array.from(this._config.matchAll(markRegex), m => allInfo.push(m));

    let flag = false;
    let content = "";
    for (let index = 0; index < this._config.length; index++) {
      const l = this._config[index];
      if (l === "<" && content !== "") {
        flag = false;
        contentInfo.push(content);
        content = "";
      }
      if (flag) {
        content += l;
      }
      if (l === ">") {
        flag = true;
        content = "";
      }
    }

    if (contentInfo.length === 0 || allInfo.length === 0) {
      this.noMarkRender(this._config);
    } else {
      let labConfig = this.resolve(allInfo, contentInfo);
      this.labRender(labConfig);
    }
  }

  resolve(allInfo, contentInfo) {
    let newMarkName = 0;
    let currMarks = [];
    let replaceInfo = [];

    for (let index = 0; index < allInfo.length; index++) {
      const el = allInfo[index];
      const mark = el[2];

      //标签是但还是双标签
      //@ts-ignore
      if (this._singleFlag.includes(mark)) {
        //这是单标签
        //let o = Object.create(objc);
        //声明数组内数据格式
        let objc = {
          name: -1,
          markList: [],
          content: null,
          isSingle: false,
        };
        newMarkName++;
        objc.isSingle = true;
        objc.name = newMarkName;
        objc.markList.push(mark);
        replaceInfo.push(objc);
        //@ts-ignore
      } else if (this._doubleFlag.includes(mark)) {
        //这是双标签
      //@ts-ignore
        if (currMarks.includes(mark)) {
          //代表了当前是结束标签
      //@ts-ignore
          let i = currMarks.findIndex(e => {
            return e === mark;
          });
          currMarks.splice(i, 1);
        } else {
          //代表了开始标签
          newMarkName++;
          currMarks.push(mark);
        }
      }
      //声明数组内数据格式
      let objc = {
        name: -1,
        markList: [],
        content: null,
        isSingle: false,
      };
      objc.name = newMarkName;
      currMarks.forEach(el => {
        objc.markList.push(el);
      });
      objc.content = contentInfo[index];
      replaceInfo.push(objc);
    }
    this.addHeadTail(replaceInfo);
    return replaceInfo;
  }

  addHeadTail(info) {
    let head = 0;
    let tail = 0;
    for (let index = 0; index < this._config.length; index++) {
      const l = this._config[index];
      if (l === "<") {
        head = index;
        break;
      }
    }
    for (let index = this._config.length - 1; index >= 0; index--) {
      const l = this._config[index];
      if (l === ">") {
        tail = index;
        break;
      }
    }
    let hstr = this._config.substring(0, head);
    let tstr = this._config.substring(tail + 1, this._config.length);
    if (hstr.length !== 0) {
      let obj = {
        name: "head",
        markList: [],
        content: hstr,
        isSingle: false,
      };
      info.unshift(obj);
    }
    if (tstr.length !== 0) {
      let obj = {
        name: "tail",
        markList: [],
        content: tstr,
        isSingle: false,
      };
      info.push(obj);
    }
  }

  labFactory() {
    let getLab = () => {
      for (let index = 0; index < this._labList.length; index++) {
        const el = this._labList[index];
        if (!el.active) {
          el.active = true;
          let l = el.getComponent(cc.Label);
          l.string = "";
          l.fontSize = this.fontSize;
          l.lineHeight = this.fontSize;
          el.height = this.fontSize;
          return el;
        }
      }
      let node = new cc.Node();
      node.parent = this.node;
      node.name = "lab" + this._labList.length + 1;
      let l = node.addComponent(cc.Label);
      l.string = "";
      l.fontSize = this.fontSize;
      l.lineHeight = this.fontSize;
      node.height = this.fontSize;
      this._labList.push(node);
      return node;
    };
    let recovery = () => {
      this._labList.forEach(el => {
        el.active = false;
        el.children.forEach(el => {
          el.active = false;
        });
      });
    };
    let updateLayout = () => {
      let minx = 0;
      let miny = 0;
      let maxx = 0;
      let maxy = 0;
      this._labList.forEach(el => {
        maxx = Math.max(el.x + el.width / 2, maxx);
        maxy = Math.max(el.y + el.height / 2, maxy);
        minx = Math.min(el.x - el.width / 2, minx);
        miny = Math.min(el.y - el.height / 2, miny);
      });
      let offsetX = (maxx-minx)/2
      let offsetY = (maxy-miny)/2

      this._labList.forEach(el=>{
        el.x-=offsetX
        el.y+=offsetY
      })
    };
    return { getLab, recovery, updateLayout };
  }

  noMarkRender(content: string) {
    this.labFactory().recovery();
    let n = this.labFactory().getLab();
    let l = n.getComponent(cc.Label);
    l.string = content;
    //@ts-ignore
    l._updateRenderData(true);
    this.labFactory().updateLayout()
  }

  labRender(config) {
    this.labFactory().recovery();
    this._pointer = cc.v2(0, 0);
    for (let index = 0; index < config.length; index++) {
      const el = config[index];
      if (el.isSingle) {
        el.markList.forEach(e => {
          //@ts-ignore
          if (Object.keys(this._markEvent).includes(e)) {
            this._markEvent[e](n);
          }
        });
        continue;
      } else if (!el.content || el.content === "") {
        continue;
      }
      let n = this.labFactory().getLab();
      let l = n.getComponent(cc.Label);
      l.string = el.content;
      //@ts-ignore
      l._updateRenderData(true);
      let offset = cc.v2(n.width / 2, -n.height / 2);
      n.setPosition(this._pointer.add(offset));
      el.markList.forEach(e => {
        //@ts-ignore
        if (Object.keys(this._markEvent).includes(e)) {
          this._markEvent[e](n);
        }
      });
      this._pointer.x += n.width;
    }
    this.labFactory().updateLayout()
  }
}
