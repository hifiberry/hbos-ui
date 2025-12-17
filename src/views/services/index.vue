<template>
  <PageContent title="Settings">
    <div class="settingsOverview">
      <ContentBoxLink :to="{ name: 'players' }" height=150>
        <div class="settingsCardHeader">
          <Icon icon="play" class="settingsCardHeaderIcon" />
          <h2>Players</h2>
        </div>
        <p>
          Manage and configure audio players
        </p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'web-services' }" height=150>
        <div class="settingsCardHeader">
          <Icon icon="cloud" class="settingsCardHeaderIcon" />
          <h2>Web Services</h2>
        </div>
        <p>Connect and manage web-based music services</p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'music-files' }" height=150>
        <div class="settingsCardHeader">
          <Icon icon="nas" class="settingsCardHeaderIcon" />
          <h2>Music Files</h2>
        </div>
        <p>Mount SMB shares and manage local music directories</p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'dsp-programs' }" height=150>
        <div class="settingsCardHeader">
          <Icon icon="download" class="settingsCardHeaderIcon" />
          <h2>DSP Programs</h2>
        </div>
        <p>Download and manage digital signal processing programs</p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'dsp-backends' }" height=150>
        <div class="settingsCardHeader">
          <Icon icon="processor" class="settingsCardHeaderIcon" />
          <h2>DSP Backends</h2>
        </div>
        <p>Select and configure digital signal processing backends</p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'system-info' }" height=150>
        <div class="settingsCardHeader">
          <Icon icon="computer" class="settingsCardHeaderIcon" />
          <h2>System Information</h2>
        </div>
        <p>View system details including Pi model, HAT information, and system UUID</p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'display' }" height=150>
        <div class="settingsCardHeader">
          <Icon icon="tv" class="settingsCardHeaderIcon" />
          <h2>Display</h2>
        </div>
        <p>Configure display settings and screen options</p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'bluetooth-settings' }" height=150>
        <div class="settingsCardHeader">
          <Icon icon="bluetooth" class="settingsCardHeaderIcon" />
          <h2>Bluetooth</h2>
        </div>
        <p>Manage Bluetooth settings</p>
      </ContentBoxLink>

      <ContentBoxLink :to="{ name: 'system-tools'}" height=150>
        <div class="settingsCardHeader">
          <Icon icon="tool" class="settingsCardHeaderIcon" />
          <h2>System Tools</h2>
        </div>
        <p class="settingsCardWarningText">
          <strong>⚠️ Use with caution:</strong> These tools can leave the system in an unusable state if used incorrectly.
        </p>
      </ContentBoxLink>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'
import ContentBoxLink from "@/components/ContentBoxLink.vue"
import PageContent from "@/components/PageContent.vue"
</script>

<style scoped lang="scss">
.settingsOverview{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;

  .settingsCardHeader{
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 10px;

    .settingsCardHeaderIcon{
      margin-right: 10px;
    }
  }

  .settingsCardWarningText{
    strong{
      color: var(--primary);
    }
  }
}
</style>
