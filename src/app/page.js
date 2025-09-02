import React from "react";
import { Container, Box, Typography } from "@mui/material";
import DiagramTree from "./components/DiagramTree";

export default function Page() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <DiagramTree />
      </Box>
    </Container>
  );
}
