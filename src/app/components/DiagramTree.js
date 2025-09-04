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
import Xarrow from "react-xarrows";

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

/* initial data */
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
  const [openAdd, setOpenAdd] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [addTarget, setAddTarget] = React.useState(null);

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
    setExpanded((p) => ({ ...p, [ctx.node.id]: true }));
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
      return;
    }
    const child = {
      id: `${addTarget}-${Math.random().toString(36).slice(2, 8)}`,
      label: newLabel.trim(),
    };
    setTree((prev) => insertChild(prev, addTarget, child));
    setExpanded((p) => ({ ...p, [addTarget]: true }));
    setNewLabel("");
    setAddTarget(null);
    setOpenAdd(false);
  };

  const getCols = () => tree[0]?.children ?? [];

  const renderNode = (node) => (
    <Box
      key={node.id}
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 4,
      }}
    >
      {/* Parent node */}
      <Box
        id={node.id}
        onContextMenu={(e) => handleContext(e, node)}
        sx={{
          border: "1px solid #e57373",
          borderRadius: 12,
          px: 2,
          py: 1,
          minWidth: 140,
          bgcolor: "#fff",
          cursor: "context-menu",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          {node.children ? (
            <IconButton
              size="small"
              onClick={() => handleToggle(node.id)}
              sx={{ p: 0.4 }}
            >
              {expanded[node.id] ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          ) : (
            <Box sx={{ width: 28 }} />
          )}
          <Typography variant="body2">{node.label}</Typography>
        </Stack>
      </Box>

      {/* Children container */}
      {node.children && expanded[node.id] && (
        <Box
          sx={{
            display: "block", // بچه‌ها بلوکی زیر هم
          }}
        >
          {node.children.map((ch, index) => (
            <Box key={ch.id} sx={{ mb: 2, mt: 0.7 }}>
              {renderNode(ch)}
              <Xarrow
                start={node.id}
                end={ch.id}
                path="smooth"
                curveness={0.4}
                strokeWidth={2}
                color="#9e9e9e"
                headSize={5}
                showHead
                startAnchor="left"
                endAnchor="right"
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ width: "100vw", height: "100vh", bgcolor: "#fafafa" }}>
      <Card sx={{ width: "100%", height: "100%", boxShadow: "none" }}>
        <CardHeader title="پنل دیاگرام — تست" />
        <Divider />
        <CardContent sx={{ height: "calc(100vh - 120px)" }}>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              overflow: "auto",
              p: 4,
              bgcolor: "#fff",
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 12 }}>
              {getCols().map((col) => renderNode(col))}
            </Box>
          </Box>
        </CardContent>

        <Menu
          open={!!ctx.anchor}
          onClose={closeCtx}
          anchorReference="anchorPosition"
          anchorPosition={
            ctx.anchor ? { top: ctx.anchor.y, left: ctx.anchor.x } : undefined
          }
        >
          <MenuItem onClick={doCut}>
            <ContentCut fontSize="small" sx={{ ml: 1 }} /> برش
          </MenuItem>
          <MenuItem onClick={doCopy}>
            <ContentCopy fontSize="small" sx={{ ml: 1 }} /> کپی
          </MenuItem>
          <MenuItem onClick={doPaste} disabled={!buffer}>
            <ContentPaste fontSize="small" sx={{ ml: 1 }} /> پیست
          </MenuItem>
          <MenuItem onClick={doDelete}>
            <DeleteOutline fontSize="small" sx={{ ml: 1 }} /> حذف
          </MenuItem>
          <MenuItem onClick={doAdd}>
            <Add fontSize="small" sx={{ ml: 1 }} /> افزودن زیرشاخه
          </MenuItem>
        </Menu>

        <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth>
          <DialogTitle>افزودن زیرشاخه</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              autoFocus
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
