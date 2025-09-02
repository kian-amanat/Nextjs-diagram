// src/app/components/DiagramTree.jsx
"use client";

import React from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Divider,
  Stack,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  ContentCut,
  ContentCopy,
  ContentPaste,
  DeleteOutline,
  Add,
} from "@mui/icons-material";

/* helpers */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function removeNodeById(list, id) {
  return list
    .map((n) => ({
      ...n,
      children: n.children ? removeNodeById(n.children, id) : undefined,
    }))
    .filter((n) => n.id !== id);
}
function insertChild(list, targetId, child) {
  return list.map((n) => {
    if (n.id === targetId) {
      const kids = n.children ? [...n.children, child] : [child];
      return { ...n, children: kids };
    }
    return {
      ...n,
      children: n.children
        ? insertChild(n.children, targetId, child)
        : n.children,
    };
  });
}

/* initial */
const initialData = [
  {
    id: "root",
    label: "حساب‌های اصلی",
    children: [
      {
        id: "col1",
        label: "دارایی‌های جاری",
        children: [
          { id: "c1-1", label: "۱-۱ نقد و بانک" },
          { id: "c1-2", label: "۱-۲ حساب‌های دریافتنی" },
        ],
      },
      {
        id: "col2",
        label: "دارایی‌های غیرجاری",
        children: [
          { id: "c2-1", label: "۲-۱ دارایی ثابت" },
          { id: "c2-2", label: "۲-۲ تجهیزات" },
        ],
      },
      {
        id: "col3",
        label: "بدهی‌ها و سرمایه",
        children: [
          { id: "c3-1", label: "۳-۱ حساب‌های پرداختنی" },
          { id: "c3-2", label: "۳-۲ مالیات پرداختنی" },
        ],
      },
    ],
  },
];

export default function DiagramTree() {
  const [tree, setTree] = React.useState(initialData);
  const [expanded, setExpanded] = React.useState({});
  const [ctx, setCtx] = React.useState({ anchor: null, node: null });
  const [buffer, setBuffer] = React.useState(null);
  const [edges, setEdges] = React.useState([]);

  const containerRef = React.useRef(null);
  const nodeRefs = React.useRef(new Map());

  // add-node dialog state
  const [openAdd, setOpenAdd] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [addTarget, setAddTarget] = React.useState(null); // persist parent id

  React.useEffect(() => {
    // compute orthogonal edges after render
    const compute = () => {
      const c = containerRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();

      // collect parent->child pairs for visible structure
      const pairs = [];
      const walk = (arr) => {
        for (const n of arr) {
          if (n.children && n.children.length) {
            for (const ch of n.children) {
              pairs.push({ from: n.id, to: ch.id });
              walk([ch]);
            }
          }
        }
      };
      walk(tree);

      const next = [];

      // پارامترهای ظاهری — می‌تونی این‌ها رو تغییر بدی
      const START_OFFSET = 4; // فاصلهٔ اندک از لبهٔ والد (px) — شروع پیکان بیرون از باکس والد
      const END_OFFSET = 4; // فاصلهٔ اندک قبل از لبهٔ فرزند (px) — نوک پیکان جلوی باکس فرزند
      const MIN_SPREAD = 40; // حداقل spread برای elbow

      for (const p of pairs) {
        const a = nodeRefs.current.get(p.from);
        const b = nodeRefs.current.get(p.to);
        if (!a || !b) continue;

        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();

        // START: دقیقا در لبهٔ راستِ والد (با یک offset کوچک)
        const x1 = ra.right - rect.left + START_OFFSET;
        const y1 = ra.top - rect.top + ra.height / 2;

        // END: دقیقا قبل از لبهٔ چپِ فرزند (با offset کوچک)
        const x2 = rb.left - rect.left - END_OFFSET;
        const y2 = rb.top - rect.top + rb.height / 2;

        // اگر x2 خیلی نزدیک x1 باشه، از خط سادهٔ مستقیم استفاده میکنیم
        if (x2 <= x1 + 8) {
          const d = `M ${x1} ${y1} L ${x2} ${y2}`;
          next.push({ id: `${p.from}->${p.to}`, d });
          continue;
        }

        // محاسبهٔ نقطهٔ میانی برای elbow (L-shaped path)
        const spread = Math.max(MIN_SPREAD, Math.round((x2 - x1) * 0.25));
        let mx = Math.round(x1 + spread);
        if (mx > x2 - 12) mx = Math.round((x1 + x2) / 2);

        const d = `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
        next.push({ id: `${p.from}->${p.to}`, d });
      }

      setEdges(next);
    };

    // delay کمی تا DOM رندر کامل بشه
    const t = setTimeout(compute, 80);
    window.addEventListener("resize", compute);

    // observe layout changes تا هنگام باز/بسته شدن و افزودن دوباره محاسبه بشه
    const obs = new MutationObserver(() => compute());
    if (containerRef.current) {
      obs.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", compute);
      obs.disconnect();
    };
  }, [tree, expanded]);

  const handleToggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const handleContext = (e, node) => {
    e.preventDefault();
    setCtx({ anchor: { x: e.clientX, y: e.clientY }, node });
  };
  const closeCtx = () => setCtx({ anchor: null, node: null });

  const doCut = () => {
    if (!ctx.node) return;
    setBuffer({ type: "cut", node: ctx.node });
    setTree((prev) => removeNodeById(prev, ctx.node.id));
    closeCtx();
  };
  const doCopy = () => {
    if (!ctx.node) return;
    setBuffer({ type: "copy", node: deepClone(ctx.node) });
    closeCtx();
  };
  const doPaste = () => {
    if (!ctx.node || !buffer) return;
    if (buffer.type === "copy") {
      const cloned = deepClone(buffer.node);
      const fresh = `${cloned.id}-${Date.now().toString(36)}`;
      const patch = (n) => ({
        ...n,
        id:
          n.id === cloned.id
            ? fresh
            : `${n.id}-${Math.random().toString(36).slice(2, 6)}`,
        children: n.children?.map(patch),
      });
      setTree((prev) => insertChild(prev, ctx.node.id, patch(cloned)));
    } else {
      setTree((prev) => insertChild(prev, ctx.node.id, buffer.node));
      setBuffer(null);
    }
    setExpanded((prev) => ({ ...prev, [ctx.node.id]: true }));
    closeCtx();
  };
  const doDelete = () => {
    if (!ctx.node) return;
    setTree((prev) => removeNodeById(prev, ctx.node.id));
    closeCtx();
  };

  const doAdd = () => {
    if (!ctx.node) return;
    setAddTarget(ctx.node.id);
    setOpenAdd(true);
    closeCtx();
  };

  const confirmAdd = () => {
    if (!addTarget || !newLabel.trim()) {
      setOpenAdd(false);
      setNewLabel("");
      setAddTarget(null);
      return;
    }
    const child = {
      id: `${addTarget}-${Math.random().toString(36).slice(2, 8)}`,
      label: newLabel.trim(),
    };
    setTree((prev) => insertChild(prev, addTarget, child));
    setExpanded((prev) => ({ ...prev, [addTarget]: true }));
    setNewLabel("");
    setAddTarget(null);
    setOpenAdd(false);
  };

  // render helpers
  const getCols = () => tree[0]?.children ?? [];

  return (
    <Box sx={{ width: "100vw", height: "100vh", bgcolor: "#fafafa", p: 0 }}>
      <Card
        sx={{
          width: "100%",
          height: "100%",
          boxShadow: "none",
          borderRadius: 0,
        }}
      >
        <CardHeader title="پنل دیاگرام — تست" sx={{ px: 4, pt: 3 }} />
        <Divider />
        <CardContent sx={{ height: "calc(100vh - 120px)", px: 4, py: 4 }}>
          <Box
            ref={containerRef}
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "auto",
              bgcolor: "#fff",
              borderRadius: 2,
              p: 4,
            }}
          >
            {/* SVG edges */}
            <svg
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
              width="100%"
              height="100%"
            >
              <defs>
                {/* marker: refX برابر با طول پیکان قرار گرفته تا نوک وارد باکس نشود */}
                <marker
                  id="arrow-flat"
                  markerWidth="12"
                  markerHeight="10"
                  refX="10"
                  refY="5"
                  orient="auto"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill="#9e9e9e" />
                </marker>
              </defs>

              {edges.map((e) => (
                <path
                  key={e.id}
                  d={e.d}
                  stroke="#9e9e9e"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrow-flat)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>

            {/* columns */}
            <Box sx={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {getCols().map((col) => (
                <Box
                  key={col.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  {/* column header */}
                  <Box
                    ref={(el) => {
                      if (el) nodeRefs.current.set(col.id, el);
                      else nodeRefs.current.delete(col.id);
                    }}
                    onContextMenu={(e) => handleContext(e, col)}
                    sx={{
                      border: "1px solid #e57373",
                      borderRadius: 12,
                      px: 3,
                      py: 1.2,
                      minWidth: 160,
                      marginRight: -10,
                      textAlign: "center",
                      bgcolor: "#fff",
                      cursor: "context-menu",
                    }}
                  >
                    <Typography variant="body2">{col.label}</Typography>
                  </Box>

                  {/* children of column */}
                  {col.children?.map((ch) => (
                    <Box
                      key={ch.id}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <Box
                        ref={(el) => {
                          if (el) nodeRefs.current.set(ch.id, el);
                          else nodeRefs.current.delete(ch.id);
                        }}
                        onContextMenu={(e) => handleContext(e, ch)}
                        sx={{
                          border: "1px solid #e57373",
                          borderRadius: 8,
                          px: 2,
                          py: 0.8,
                          marginRight: 10,
                          minWidth: 140,
                          textAlign: "center",
                          bgcolor: "#fff",
                          cursor: "context-menu",
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="center"
                          spacing={1}
                        >
                          {ch.children ? (
                            <IconButton
                              size="small"
                              onClick={() => handleToggle(ch.id)}
                              sx={{ p: 0.4 }}
                            >
                              {expanded[ch.id] ? (
                                <ExpandLess />
                              ) : (
                                <ExpandMore />
                              )}
                            </IconButton>
                          ) : (
                            <Box sx={{ width: 28 }} />
                          )}
                          <Typography variant="body2">{ch.label}</Typography>
                        </Stack>
                      </Box>

                      {ch.children && expanded[ch.id] && (
                        <Box sx={{ display: "flex", gap: 8 }}>
                          {ch.children.map((gc) => (
                            <Box
                              key={gc.id}
                              ref={(el) => {
                                if (el) nodeRefs.current.set(gc.id, el);
                                else nodeRefs.current.delete(gc.id);
                              }}
                              onContextMenu={(e) => handleContext(e, gc)}
                              sx={{
                                border: "1px solid #e57373",
                                borderRadius: 8,
                                px: 2,
                                py: 0.8,
                                minWidth: 140,
                                textAlign: "center",
                                bgcolor: "#fff",
                                cursor: "context-menu",
                              }}
                            >
                              <Typography variant="body2">
                                {gc.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>

        {/* context menu */}
        <Menu
          open={!!ctx.anchor}
          onClose={closeCtx}
          anchorReference="anchorPosition"
          anchorPosition={
            ctx.anchor ? { top: ctx.anchor.y, left: ctx.anchor.x } : undefined
          }
        >
          <MenuItem onClick={doCut}>
            <ContentCut fontSize="small" sx={{ ml: 1 }} /> برش (Cut)
          </MenuItem>
          <MenuItem onClick={doCopy}>
            <ContentCopy fontSize="small" sx={{ ml: 1 }} /> کپی (Copy)
          </MenuItem>
          <MenuItem onClick={doPaste} disabled={!buffer}>
            <ContentPaste fontSize="small" sx={{ ml: 1 }} /> پیست (Paste)
          </MenuItem>
          <MenuItem onClick={doDelete}>
            <DeleteOutline fontSize="small" sx={{ ml: 1 }} /> حذف (Delete)
          </MenuItem>
          <MenuItem onClick={doAdd}>
            <Add fontSize="small" sx={{ ml: 1 }} /> افزودن زیرشاخه
          </MenuItem>
        </Menu>

        {/* add dialog */}
        <Dialog
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>افزودن زیرشاخه</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="عنوان نود"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAdd(false)}>انصراف</Button>
            <Button onClick={confirmAdd} variant="contained">
              افزودن
            </Button>
          </DialogActions>
        </Dialog>
      </Card>
    </Box>
  );
}
